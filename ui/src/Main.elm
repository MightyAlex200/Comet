module Main exposing (main)

import Browser exposing (Document, UrlRequest)
import Browser.Navigation as Navigation
import Comet.Port exposing (Id)
import Comet.Types.Address exposing (Address)
import Comet.Types.Load exposing (Load(..))
import Comet.Types.Search exposing (Search)
import Comet.Types.SearchResult exposing (InTermsOf)
import Html exposing (Html)
import Html.Attributes
import Html.Events
import Json.Decode as Decode exposing (Value)
import KarmaMap exposing (KarmaMap)
import Parser as Parse
import PostCompose exposing (PostCompose)
import PostModel
    exposing
        ( PostModel
        , PostMsg
        )
import SearchParse
import SearchView exposing (SearchView)
import Set
import Settings exposing (Settings)
import Url exposing (Url)
import Url.Parser as Parser exposing ((</>), Parser)



-- Model


type alias DebugModel =
    { postPageAddress : Address
    , searchQuery : String
    , excludeCrossposts : Bool
    }


initDebugModel : DebugModel
initDebugModel =
    { postPageAddress = ""
    , searchQuery = ""
    , excludeCrossposts = False
    }


type Page
    = PostPage PostModel
    | CreatePost PostCompose
    | SearchPage SearchView
    | DebugScreen DebugModel
    | NotFound


type Route
    = PostRoute Address (Maybe InTermsOf)
    | CreatePostRoute
    | SearchViewRoute Search Bool
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
    | PostPageMsg PostMsg
    | PostComposeMsg PostCompose.Msg
    | SetDebugModel DebugModel
    | FunctionReturned Comet.Port.FunctionReturn
    | UpdateSettings Settings
    | SettingsUpdated Value


init : () -> Url -> Navigation.Key -> ( Model, Cmd Msg )
init _ _ key =
    let
        model =
            { key = key
            , page = DebugScreen initDebugModel
            , lastUsedFunctionId = 0
            , settings = Settings.defaultSettings
            }
    in
    ( model, Navigation.pushUrl key "/debug" )


tagsParser : Parser (InTermsOf -> a) a
tagsParser =
    Parser.custom "TAGS"
        (\s ->
            s
                |> String.split ","
                |> List.filterMap
                    (Decode.decodeString Decode.int >> Result.toMaybe)
                |> Set.fromList
                |> (\set ->
                        if Set.isEmpty set then
                            Nothing

                        else
                            Just set
                   )
        )


searchParser : Parser (Search -> a) a
searchParser =
    Parser.custom "SEARCH"
        (Url.percentDecode
            >> Maybe.andThen
                (Parse.run SearchParse.search >> Result.toMaybe)
        )


boolParser : Parser (Bool -> a) a
boolParser =
    Parser.custom "BOOL"
        (\s ->
            case s of
                "true" ->
                    Just True

                "false" ->
                    Just False

                _ ->
                    Nothing
        )


routeParser : Parser (Route -> a) a
routeParser =
    Parser.oneOf
        [ Parser.map
            (\address inTermsOf -> PostRoute address (Just inTermsOf))
            (Parser.s "post" </> Parser.string </> tagsParser)
        , Parser.map
            (\address -> PostRoute address Nothing)
            (Parser.s "post" </> Parser.string)
        , Parser.map CreatePostRoute (Parser.s "createPost")
        , Parser.map SearchViewRoute
            (Parser.s "search" </> searchParser </> boolParser)
        , Parser.map DebugScreenRoute (Parser.s "debug")
        ]


pageFromRoute : Model -> Route -> ( Model, Cmd Msg )
pageFromRoute model route =
    case route of
        PostRoute address inTermsOf ->
            let
                ( newId, postPage, cmd ) =
                    PostModel.init model.lastUsedFunctionId address inTermsOf
            in
            ( { model
                | page =
                    PostPage postPage
                , lastUsedFunctionId = newId
              }
            , cmd
            )

        CreatePostRoute ->
            ( { model | page = CreatePost PostCompose.init }, Cmd.none )

        SearchViewRoute query excludeCrossposts ->
            let
                ( searchId, searchView, searchCmd ) =
                    SearchView.init
                        model.lastUsedFunctionId
                        query
                        excludeCrossposts
            in
            ( { model
                | page =
                    SearchPage searchView
                , lastUsedFunctionId = searchId
              }
            , searchCmd
            )

        DebugScreenRoute ->
            ( { model | page = DebugScreen initDebugModel }, Cmd.none )



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

        ( _, UpdateSettings settings ) ->
            ( model, Settings.saveSettings settings )

        ( _, SettingsUpdated value ) ->
            case value |> Decode.decodeValue Settings.decode of
                Ok settings ->
                    ( { model | settings = settings }
                    , Cmd.none
                    )

                Err _ ->
                    ( model, Cmd.none )

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

        ( PostPage postPageModel, PostPageMsg postPageMsg ) ->
            let
                ( newId, postPage, cmd ) =
                    PostModel.update
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

        ( SearchPage searchView, FunctionReturned functionReturn ) ->
            let
                ( newId, newSearchView, cmd ) =
                    SearchView.handleFunctionReturn
                        model.lastUsedFunctionId
                        functionReturn
                        searchView
            in
            ( { model
                | page = SearchPage newSearchView
                , lastUsedFunctionId = newId
              }
            , cmd
            )

        ( CreatePost postCompose, FunctionReturned functionReturn ) ->
            let
                ( newId, newPostCompose, cmd ) =
                    PostCompose.handleFunctionReturn
                        model.key
                        model.lastUsedFunctionId
                        functionReturn
                        postCompose
            in
            ( { model
                | page =
                    CreatePost newPostCompose
                , lastUsedFunctionId = newId
              }
            , cmd
            )

        ( CreatePost postCompose, PostComposeMsg composeMsg ) ->
            let
                ( newId, newPostCompose, composeCmd ) =
                    PostCompose.update
                        model.lastUsedFunctionId
                        composeMsg
                        postCompose
            in
            ( { model
                | page =
                    CreatePost newPostCompose
                , lastUsedFunctionId = newId
              }
            , Cmd.map PostComposeMsg composeCmd
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


debugView : Settings -> DebugModel -> Html Msg
debugView settings debugModel =
    Html.ul []
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
            , Html.a
                [ Html.Attributes.href "/createPost/" ]
                [ Html.text "Create post" ]
            , Html.br [] []
            , Html.a
                [ Html.Attributes.href
                    ("/search/"
                        ++ debugModel.searchQuery
                        ++ "/"
                        ++ (if debugModel.excludeCrossposts then
                                "true"

                            else
                                "false"
                           )
                    )
                ]
                [ Html.text "Search" ]
            , Html.input
                [ Html.Events.onInput
                    (\input ->
                        SetDebugModel { debugModel | searchQuery = input }
                    )
                ]
                []
            , Html.text "Exclude crossposts: "
            , Html.input
                [ Html.Attributes.type_ "checkbox"
                , Html.Events.onCheck
                    (\checked ->
                        SetDebugModel { debugModel | excludeCrossposts = checked }
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
                        UpdateSettings
                            { settings
                                | markdownSettings =
                                    { markdownSettings
                                        | smartypants = checked
                                    }
                            }
                    )
                ]
                []
            , Html.br [] []
            , Html.button
                [ Html.Events.onClick (UpdateSettings Settings.defaultSettings) ]
                [ Html.text "Reset settings" ]
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
                        (PostModel.view
                            model.settings
                            postPageModel
                        )

                CreatePost postCompose ->
                    PostCompose.view postCompose
                        |> Html.map PostComposeMsg

                SearchPage searchView ->
                    SearchView.view searchView

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
