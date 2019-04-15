module Main exposing (main)

import Browser exposing (Document, UrlRequest)
import Browser.Navigation as Navigation
import Comet.Comments
import Comet.Port exposing (FunctionReturn, Id, getNewId)
import Comet.Posts
import Comet.Types.Address exposing (Address)
import Comet.Types.Comment as Comment exposing (Comment)
import Comet.Types.Load as Load exposing (Load(..))
import Comet.Types.Post as Post exposing (Post)
import Comet.Types.Tag exposing (Tag)
import Comet.Types.ZomeApiError as ZomeApiError exposing (ZomeApiError)
import Comet.Types.ZomeApiResult as ZomeApiResult exposing (ZomeApiResult)
import CommentModel
    exposing
        ( CommentModel
        , CommentTreeModel
        , initCommentTreeModel
        , updateCommentTreeModel
        , viewCommentTree
        )
import Dict exposing (Dict)
import Html exposing (Html)
import Html.Attributes
import Json.Decode as Decode
import PostModel
    exposing
        ( PostPageModel
        , PostPageMsg
        , initPostPageModel
        , updatePostPageModel
        , viewPostPage
        )
import Url exposing (Url)
import Url.Parser as Parser exposing ((</>), Parser)



-- Model


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


type alias Model =
    { page : Page
    , key : Navigation.Key
    , lastUsedFunctionId : Id
    }


type Msg
    = UrlChange Url
    | UrlRequest UrlRequest
    | PostPageMsg PostPageMsg
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
    case ( model.page, msg ) of
        ( _, UrlChange url ) ->
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

        ( _, UrlRequest request ) ->
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

        ( PostPage postPageModel, FunctionReturned functionReturn ) ->
            let
                ( newId, postPage, cmd ) =
                    updatePostPageModel
                        model.lastUsedFunctionId
                        (PostModel.FunctionReturned functionReturn)
                        postPageModel
            in
            ( { model
                | page =
                    PostPage postPage
                , lastUsedFunctionId = newId
              }
            , Cmd.map PostPageMsg cmd
            )

        ( _, FunctionReturned functionReturn ) ->
            -- TODO
            ( model, Cmd.none )

        ( PostPage postPageModel, PostPageMsg postPageMsg ) ->
            let
                ( newId, postPage, cmd ) =
                    updatePostPageModel
                        model.lastUsedFunctionId
                        postPageMsg
                        postPageModel
            in
            ( { model
                | page =
                    PostPage postPage
                , lastUsedFunctionId = newId
              }
            , Cmd.map PostPageMsg cmd
            )

        ( _, PostPageMsg _ ) ->
            ( model, Cmd.none )


subscriptions : Model -> Sub Msg
subscriptions model =
    Comet.Port.functionReturned FunctionReturned



-- View


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
                    Html.map
                        PostPageMsg
                        (viewPostPage postPageModel)

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
