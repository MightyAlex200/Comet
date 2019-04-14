module Main exposing (main)

import Browser exposing (Document, UrlRequest)
import Browser.Navigation as Navigation
import Comet.Comments
import Comet.Port exposing (FunctionReturn, Id)
import Comet.Posts
import Comet.Types.Address exposing (Address)
import Comet.Types.Comment as Comment exposing (Comment)
import Comet.Types.Load as Load exposing (Load(..))
import Comet.Types.Post as Post exposing (Post)
import Comet.Types.Tag exposing (Tag)
import Comet.Types.ZomeApiError as ZomeApiError exposing (ZomeApiError)
import Comet.Types.ZomeApiResult as ZomeApiResult exposing (ZomeApiResult)
import Dict exposing (Dict)
import Html exposing (Html)
import Html.Attributes
import Json.Decode as Decode
import Url exposing (Url)
import Url.Parser as Parser exposing ((</>), Parser)



-- Model


type alias CommentModel =
    { address : Address
    , comment : Load ZomeApiError Comment
    , readId : Id
    , treeModel : CommentTreeModel
    }


type CommentTreeModel
    = CommentTreeModel
        { address : Address
        , subcomments : Load ZomeApiError (List CommentModel)
        , readId : Id
        }


initCommentModel : Id -> Address -> ( Id, CommentModel, Cmd msg )
initCommentModel oldId address =
    let
        newReadId =
            getNewId oldId

        ( newId, commentTreeModel, ctmCmds ) =
            initCommentTreeModel newReadId address

        commentModel =
            { address = address
            , comment = Unloaded
            , readId = newReadId
            , treeModel = commentTreeModel
            }
    in
    ( newId
    , commentModel
    , Cmd.batch
        [ ctmCmds
        , Comet.Comments.readComment newReadId address
        ]
    )


initCommentTreeModel : Id -> Address -> ( Id, CommentTreeModel, Cmd msg )
initCommentTreeModel oldId address =
    let
        newReadId =
            getNewId oldId

        commentTreeModel =
            CommentTreeModel
                { address = address
                , subcomments = Unloaded
                , readId = newReadId
                }
    in
    ( newReadId
    , commentTreeModel
    , Comet.Comments.commentsFromAddress newReadId address
    )


type alias PostPageModel =
    { address : Address
    , post : Load ZomeApiError Post
    , comments : CommentTreeModel
    , readId : Id
    }


initPostPageModel : Id -> Address -> ( Id, PostPageModel, Cmd msg )
initPostPageModel oldId address =
    let
        newReadId =
            getNewId oldId

        ( newId, ctm, ctmCmds ) =
            initCommentTreeModel newReadId address

        postPageModel =
            { address = address
            , post = Unloaded
            , comments = ctm
            , readId = newReadId
            }
    in
    ( newId
    , postPageModel
    , Cmd.batch
        [ Comet.Posts.readPost newReadId address
        , ctmCmds
        ]
    )


updateCommentModel :
    Id
    -> Comet.Port.FunctionReturn
    -> CommentModel
    -> ( Id, CommentModel, Cmd msg )
updateCommentModel oldId ret commentModel =
    if ret.id == commentModel.readId then
        let
            decoder =
                ZomeApiResult.decode Comment.decode

            decodeResult =
                Decode.decodeValue decoder ret.return

            updateComment comment =
                ( oldId
                , { commentModel | comment = comment }
                , Cmd.none
                )
        in
        case decodeResult of
            Ok (Ok comment) ->
                updateComment (Loaded comment)

            Ok (Err apiError) ->
                updateComment (Failed apiError)

            Err decodeError ->
                updateComment
                    (Failed (ZomeApiError.Internal "Invalid return"))

    else
        let
            ( newId, treeModel, cmds ) =
                updateCommentTreeModel oldId ret commentModel.treeModel
        in
        ( newId
        , { commentModel | treeModel = treeModel }
        , cmds
        )


commentsFromAddresses :
    Id
    -> CommentTreeModel
    -> List Address
    -> ( Id, CommentTreeModel, Cmd msg )
commentsFromAddresses oldId treeModel addresses =
    let
        treeModelRecord =
            case treeModel of
                CommentTreeModel r ->
                    r

        fold address ( i, cs, cmds ) =
            let
                ( i2, c, cmd ) =
                    initCommentModel i address
            in
            ( i2, c :: cs, cmd :: cmds )

        ( newId, comments, newCmds ) =
            addresses
                |> List.foldl fold ( oldId, [], [] )
    in
    ( newId
    , CommentTreeModel { treeModelRecord | subcomments = Loaded comments }
    , Cmd.batch newCmds
    )


updateCommentTreeModel :
    Id
    -> Comet.Port.FunctionReturn
    -> CommentTreeModel
    -> ( Id, CommentTreeModel, Cmd msg )
updateCommentTreeModel oldId ret treeModel =
    let
        treeModelRecord =
            case treeModel of
                CommentTreeModel r ->
                    r
    in
    if ret.id == treeModelRecord.readId then
        let
            decoder =
                ZomeApiResult.decode (Decode.list Decode.string)

            decodeResult =
                Decode.decodeValue decoder ret.return

            updateSubcomments subcomments =
                ( oldId
                , CommentTreeModel { treeModelRecord | subcomments = subcomments }
                , Cmd.none
                )
        in
        case decodeResult of
            Ok (Ok addresses) ->
                commentsFromAddresses oldId treeModel addresses

            Ok (Err apiError) ->
                updateSubcomments (Failed apiError)

            Err decodeError ->
                updateSubcomments (Failed (ZomeApiError.Internal "Invalid return"))

    else
        case treeModelRecord.subcomments of
            Loaded subcomments ->
                let
                    fold subcomment ( i, cs, cmds ) =
                        let
                            ( i2, c, cmd ) =
                                updateCommentModel i ret subcomment
                        in
                        ( i2, c :: cs, cmd :: cmds )

                    ( newId, newSubcomments, newCmds ) =
                        subcomments
                            |> List.foldl fold ( oldId, [], [] )
                in
                ( newId
                , CommentTreeModel
                    { treeModelRecord
                        | subcomments = Loaded newSubcomments
                    }
                , Cmd.batch newCmds
                )

            _ ->
                ( oldId, treeModel, Cmd.none )


updatePostPageModel :
    Id
    -> Comet.Port.FunctionReturn
    -> PostPageModel
    -> ( Id, PostPageModel, Cmd msg )
updatePostPageModel oldId ret pageModel =
    if ret.id == pageModel.readId then
        let
            decoder =
                ZomeApiResult.decode Post.decode

            decodeResult =
                Decode.decodeValue decoder ret.return

            updatePost post =
                ( oldId
                , { pageModel
                    | post = post
                  }
                , Cmd.none
                )
        in
        case decodeResult of
            Ok apiResult ->
                updatePost (Load.fromResult apiResult)

            Err decodeError ->
                updatePost (Failed (ZomeApiError.Internal "Invalid return"))

    else
        let
            ( newId, treeModel, cmd ) =
                updateCommentTreeModel oldId ret pageModel.comments
        in
        ( newId
        , { pageModel | comments = treeModel }
        , cmd
        )


type alias PostPreviewModel =
    { address : Address
    , post : Load ZomeApiError Post
    }


type alias TagViewModel =
    { tag : Tag
    , posts : Load ZomeApiError (List PostPreviewModel)
    }


type Page
    = PostPage PostPageModel
    | TagView TagViewModel
    | DebugScreen
    | NotFound


type Route
    = PostRoute Address
    | TagViewRoute Tag
    | DebugScreenRoute


getNewId : Id -> Id
getNewId id =
    id + 1


type alias Model =
    { page : Page
    , key : Navigation.Key
    , lastUsedFunctionId : Id
    }


type Msg
    = UrlChange Url
    | UrlRequest UrlRequest
    | FunctionReturned Comet.Port.FunctionReturn


init : () -> Url -> Navigation.Key -> ( Model, Cmd Msg )
init _ url key =
    let
        model =
            { key = key
            , page = DebugScreen
            , lastUsedFunctionId = 0
            }
    in
    ( model, Navigation.pushUrl key "/debug" )


routeParser : Parser (Route -> a) a
routeParser =
    Parser.oneOf
        [ Parser.map PostRoute (Parser.s "post" </> Parser.string)
        , Parser.map TagViewRoute (Parser.s "tag" </> Parser.int)
        , Parser.map DebugScreenRoute (Parser.s "debug")
        ]


pageFromRoute : Model -> Route -> ( Model, Cmd Msg )
pageFromRoute model route =
    case route of
        PostRoute address ->
            let
                ( newId, postPage, cmd ) =
                    initPostPageModel model.lastUsedFunctionId address
            in
            ( { model
                | page =
                    PostPage postPage
                , lastUsedFunctionId = newId
              }
            , cmd
            )

        TagViewRoute tag ->
            Debug.todo "TagViewRoute"

        DebugScreenRoute ->
            ( { model | page = DebugScreen }, Cmd.none )



-- Update


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        UrlChange url ->
            let
                maybeRoute =
                    Parser.parse routeParser url
            in
            case maybeRoute of
                Just route ->
                    let
                        ( newModel, cmd ) =
                            pageFromRoute model route
                    in
                    ( newModel, cmd )

                Nothing ->
                    ( { model | page = NotFound }, Cmd.none )

        UrlRequest request ->
            case request of
                Browser.Internal url ->
                    ( model
                    , Navigation.pushUrl
                        model.key
                        (Url.toString url)
                    )

                Browser.External string ->
                    ( model
                    , Navigation.load string
                    )

        FunctionReturned functionReturn ->
            case model.page of
                PostPage postPageModel ->
                    let
                        ( newId, postPage, cmd ) =
                            updatePostPageModel
                                model.lastUsedFunctionId
                                functionReturn
                                postPageModel
                    in
                    ( { model
                        | page =
                            PostPage postPage
                        , lastUsedFunctionId = newId
                      }
                    , cmd
                    )

                TagView tagViewModel ->
                    --TODO
                    ( model, Cmd.none )

                DebugScreen ->
                    ( model, Cmd.none )

                NotFound ->
                    ( model, Cmd.none )


subscriptions : Model -> Sub Msg
subscriptions model =
    Comet.Port.functionReturned FunctionReturned



-- View


viewPostPage : PostPageModel -> Html Msg
viewPostPage postPageModel =
    let
        postHtml =
            case postPageModel.post of
                Unloaded ->
                    Html.text "Loading post"

                Failed x ->
                    Html.text
                        ("Failed loading post: " ++ ZomeApiError.describe x)

                Loaded pageModel ->
                    viewPost pageModel
    in
    Html.div
        []
        [ postHtml
        , Html.br [] []
        , viewCommentTree postPageModel.comments
        ]


unorderedList : List (Html msg) -> Html msg
unorderedList list =
    list
        |> List.map List.singleton
        |> List.map (Html.li [])
        |> Html.ul []


viewCommentModel : CommentModel -> Html Msg
viewCommentModel commentModel =
    let
        commentHtml =
            case commentModel.comment of
                Loaded comment ->
                    Html.text comment.content

                Unloaded ->
                    Html.text "Loading comment"

                Failed x ->
                    Html.text
                        ("Failed loading comment: " ++ ZomeApiError.describe x)
    in
    Html.div
        []
        [ commentHtml
        , Html.br [] []
        , Html.div
            [ Html.Attributes.style "margin" "32px" ]
            [ viewCommentTree commentModel.treeModel ]
        ]


viewCommentTree : CommentTreeModel -> Html Msg
viewCommentTree ctm =
    let
        ctmRecord =
            case ctm of
                CommentTreeModel r ->
                    r
    in
    case ctmRecord.subcomments of
        Unloaded ->
            Html.text "Loading subcomments"

        Failed x ->
            Html.text
                ("Failed loading comments: " ++ ZomeApiError.describe x)

        Loaded comments ->
            comments
                |> List.map viewCommentModel
                |> unorderedList


viewPost : Post -> Html Msg
viewPost post =
    Html.div []
        [ Html.h1 [] [ Html.text post.title ]
        , Html.p [] [ Html.text post.content ]
        ]


viewTagView : TagViewModel -> Html Msg
viewTagView tagViewModel =
    -- TODO
    Html.text (Debug.toString tagViewModel)


debugView : Html Msg
debugView =
    Html.ul []
        -- TODO
        [ Html.li []
            [ Html.a
                [ Html.Attributes.href "/post/QmYdGWbHv723LDxBq5EpbJkwqDjHuC5V4XSmZ5mi58BXeP" ]
                [ Html.text "Test post view" ]
            ]
        ]


notFound : Html Msg
notFound =
    Html.text "No content at this address"


view : Model -> Document Msg
view model =
    let
        body =
            case model.page of
                PostPage postPageModel ->
                    viewPostPage postPageModel

                TagView tagViewModel ->
                    viewTagView tagViewModel

                DebugScreen ->
                    debugView

                NotFound ->
                    notFound
    in
    { title = "Comet"
    , body = [ body ]
    }



-- Main


main =
    Browser.application
        { init = init
        , onUrlChange = UrlChange
        , onUrlRequest = UrlRequest
        , subscriptions = subscriptions
        , update = update
        , view = view
        }
