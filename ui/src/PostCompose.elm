module PostCompose exposing
    ( Msg(..)
    , PostCompose
    , handleFunctionReturn
    , init
    , update
    , view
    )

import Browser.Navigation as Navigation
import Comet.Port exposing (Id, getNewId)
import Comet.Posts
import Comet.Types.SearchResult exposing (InTermsOf)
import Comet.Types.Tag exposing (Tag)
import Comet.Types.ZomeApiResult as ZomeApiResult
import Html exposing (Html)
import Html.Attributes as Attributes
import Html.Events as Events
import Json.Decode as Decode
import Set
import Task
import UnixTime exposing (currentUtcUnixTime)


type alias PostCompose =
    { title : String
    , content : String
    , tags : String
    , postId : Maybe Id
    }


type Msg
    = UpdateTitle String
    | UpdateContent String
    | UpdateTags String
    | Submit (List Tag)
    | SubmitNow (List Tag) Int


init : PostCompose
init =
    { title = ""
    , content = ""
    , tags = ""
    , postId = Nothing
    }


update : Id -> Msg -> PostCompose -> ( Id, PostCompose, Cmd Msg )
update oldId msg postCompose =
    case msg of
        UpdateTitle title ->
            ( oldId, { postCompose | title = title }, Cmd.none )

        UpdateContent content ->
            ( oldId, { postCompose | content = content }, Cmd.none )

        UpdateTags tags ->
            ( oldId, { postCompose | tags = tags }, Cmd.none )

        Submit tags ->
            ( oldId
            , postCompose
            , currentUtcUnixTime
                |> Task.perform (SubmitNow tags)
            )

        SubmitNow tags utcUnixTime ->
            let
                newId =
                    getNewId oldId

                postCmd =
                    Comet.Posts.createPost
                        newId
                        { title = postCompose.title
                        , content = postCompose.content
                        , utcUnixTime = utcUnixTime
                        }
                        tags
            in
            ( newId, { postCompose | postId = Just newId }, postCmd )


handleFunctionReturn :
    Navigation.Key
    -> Id
    -> Comet.Port.FunctionReturn
    -> PostCompose
    -> ( Id, PostCompose, Cmd msg )
handleFunctionReturn key oldId ret postCompose =
    if Just ret.id == postCompose.postId then
        let
            decoder =
                ZomeApiResult.decode Decode.string

            decodeResult =
                Decode.decodeValue decoder ret.return
        in
        case decodeResult of
            Ok (Ok address) ->
                ( oldId
                , postCompose
                , Navigation.pushUrl key ("/post/" ++ address)
                )

            _ ->
                ( oldId, postCompose, Cmd.none )

    else
        ( oldId, postCompose, Cmd.none )


view : PostCompose -> Html Msg
view postCompose =
    let
        parsedTags : Result Decode.Error (List Tag)
        parsedTags =
            postCompose.tags
                |> String.split ","
                |> List.map (Decode.decodeString Decode.int)
                |> List.foldl
                    (\elem ->
                        Result.andThen
                            (\rest ->
                                elem
                                    |> Result.map (\tag -> tag :: rest)
                            )
                    )
                    (Ok [])

        submitButton =
            case parsedTags of
                Ok tags ->
                    Html.button
                        [ Events.onClick (Submit tags) ]
                        [ Html.text "Submit" ]

                Err _ ->
                    Html.button
                        [ Attributes.disabled True
                        , Attributes.title
                            "Tags should be comma separated integers"
                        ]
                        [ Html.text "Submit" ]
    in
    Html.div
        []
        [ Html.input
            [ Events.onInput UpdateTitle
            , Attributes.placeholder "Title"
            ]
            []
        , Html.br [] []
        , Html.textarea
            [ Events.onInput UpdateContent
            , Attributes.placeholder "Content"
            ]
            []
        , Html.br [] []
        , Html.input
            [ Events.onInput UpdateTags
            , Attributes.placeholder "Tags (comma-separated)"
            ]
            []
        , Html.br [] []
        , submitButton
        ]
