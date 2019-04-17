module Main exposing (main)

import Browser exposing (Document, UrlRequest)
import Browser.Navigation as Navigation
import Comet.Port exposing (Id)
import Comet.Types.Address exposing (Address)
import Comet.Types.Load exposing (Load(..))
import Comet.Types.Post exposing (Post)
import Comet.Types.Tag exposing (Tag)
import Comet.Types.ZomeApiError exposing (ZomeApiError)
import Html exposing (Html)
import Html.Attributes
import Html.Events
import PostModel
    exposing
        ( PostPageModel
        , PostPageMsg
        , initPostPageModel
        , updatePostPageModel
        , viewPostPage
        )
import Settings exposing (Settings)
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


type alias DebugModel =
    { postPageAddress : Address
    }


defaultDebugModel : DebugModel
defaultDebugModel =
    { postPageAddress = ""
    }


type Page
    = PostPage PostPageModel
    | TagView TagViewModel
    | DebugScreen DebugModel
    | NotFound


type Route
    = PostRoute Address
    | TagViewRoute Tag
    | DebugScreenRoute


type alias Model =
    { page : Page
    , key : Navigation.Key
    , lastUsedFunctionId : Id
    , settings : Settings
    }


type Msg
    = UrlChange Url
    | UrlRequest UrlRequest
    | PostPageMsg PostPageMsg
    | SetDebugModel DebugModel
    | FunctionReturned Comet.Port.FunctionReturn
    | SettingsUpdated Settings


init : () -> Url -> Navigation.Key -> ( Model, Cmd Msg )
init _ _ key =
    let
        model =
            { key = key
            , page = DebugScreen defaultDebugModel
            , lastUsedFunctionId = 0
            , settings = Settings.defaultSettings
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
            ( { model | page = DebugScreen defaultDebugModel }, Cmd.none )



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

        ( _, SettingsUpdated settings ) ->
            ( { model | settings = settings }
            , Settings.saveSettings settings
            )

        ( PostPage postPageModel, FunctionReturned functionReturn ) ->
            let
                ( newId, postPage, cmd ) =
                    PostModel.handleFunctionReturn
                        model.lastUsedFunctionId
                        functionReturn
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

        ( DebugScreen _, SetDebugModel newDebugModel ) ->
            ( { model | page = DebugScreen newDebugModel }, Cmd.none )

        ( _, _ ) ->
            ( model, Cmd.none )


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch
        [ Comet.Port.functionReturned FunctionReturned
        , Settings.settingsUpdated SettingsUpdated
        ]



-- View


viewTagView : TagViewModel -> Html Msg
viewTagView tagViewModel =
    -- TODO
    Html.text (Debug.toString tagViewModel)


debugView : Settings -> DebugModel -> Html Msg
debugView settings debugModel =
    Html.ul []
        -- TODO
        [ Html.li []
            [ Html.a
                [ Html.Attributes.href ("/post/" ++ debugModel.postPageAddress) ]
                [ Html.text "Test post view" ]
            , Html.input
                [ Html.Events.onInput
                    (\input ->
                        SetDebugModel { debugModel | postPageAddress = input }
                    )
                ]
                []
            , Html.br [] []
            , Html.text "Smartypants: "
            , Html.input
                [ Html.Attributes.type_ "checkbox"
                , Html.Events.onCheck
                    (\checked ->
                        let
                            markdownSettings =
                                settings.markdownSettings
                        in
                        SettingsUpdated
                            { settings
                                | markdownSettings =
                                    { markdownSettings
                                        | smartypants = checked
                                    }
                            }
                    )
                ]
                []
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
                        (viewPostPage model.settings postPageModel)

                TagView tagViewModel ->
                    viewTagView tagViewModel

                DebugScreen debugModel ->
                    debugView model.settings debugModel

                NotFound ->
                    notFound
    in
    { title = "Comet"
    , body = [ body ]
    }



-- Main


main : Program () Model Msg
main =
    Browser.application
        { init = init
        , onUrlChange = UrlChange
        , onUrlRequest = UrlRequest
        , subscriptions = subscriptions
        , update = update
        , view = view
        }
