module Main exposing (..)

import SimpleKarmaMap exposing (simpleKarmaMap)
import Browser exposing (Document, UrlRequest)
import Url.Parser as Url exposing (Parser, (</>), (<?>))
import Browser.Navigation exposing (Key)
import Loadable exposing (Loadable)
import KarmaMap exposing (KarmaMap)
import Url.Parser.Query as Query
import Json.Decode as Decode
import Html exposing (Html)
import Url exposing (Url)
import TestSearchView
import TestPostView
import SearchParse
import SearchView
import PostView
import Parser

main : Program Flags Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlRequest = onUrlRequest
        , onUrlChange = onUrlChange
        }

-- Model

type alias Flags =
    ()

type alias Model =
    { page : Page
    , navKey : Key
    , karmaMap : KarmaMap
    }

type Page
    = PostView PostView.Model
    | SearchView SearchView.Model
    | TestPostView TestPostView.Model
    | TestSearchView TestSearchView.Model
    --| TagView TagView.Model
    --| UserView UserView.Model
    | EmptyPage

page : Parser ((Model -> ( Page, Cmd Msg )) -> a) a
page =
    let
        correctPostView ( postView, cmd ) =
            ( postView |> PostView
            , cmd |> Cmd.map PostViewMsg
            )
        correctTestPostView ( testPostView, cmd ) =
            ( testPostView |> TestPostView
            , cmd |> Cmd.map TestPostViewMsg
            )
        correctSearchView ( searchView, cmd ) =
            ( searchView |> SearchView
            , cmd |> Cmd.map SearchViewMsg
            )
        searchParse =
            Url.custom
                "SEARCH"
                ((Parser.run SearchParse.search) >> Result.toMaybe)
    in
        Url.oneOf
            [ Url.map
                (\hash inTermsOfString model ->
                    let
                        inTermsOf =
                            inTermsOfString
                                |> Maybe.andThen (Result.toMaybe << Decode.decodeString (Decode.list Decode.int))
                    in
                        correctPostView (PostView.fromHash model.karmaMap hash inTermsOf)
                )
                (Url.s "post" </> Url.string <?> Query.string "inTermsOf")
            , Url.map (\model -> correctTestPostView (TestPostView.init model.navKey)) (Url.s "testPost")
            , Url.map (\tags model -> correctSearchView (SearchView.init model.karmaMap tags)) (Url.s "search" </> searchParse)
            ]

type Msg
    = PostViewMsg PostView.Msg
    | TestPostViewMsg TestPostView.Msg
    | TestSearchViewMsg TestSearchView.Msg
    | SearchViewMsg SearchView.Msg
    --| TagViewMsg TagView.Msg
    --| UserViewMsg UserView.Msg
    | ChangePage (Model -> ( Page, Cmd Msg ))
    | NoOp

init : Flags -> Url -> Key -> ( Model, Cmd Msg )
init flags url key =
    let
        correctType tuple =
            ( Model (TestSearchView (Tuple.first tuple)) key simpleKarmaMap -- TODO: real karmamap
            , Cmd.map TestSearchViewMsg (Tuple.second tuple)
            )
    in
        correctType (TestSearchView.init key)

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        PostViewMsg postMsg ->
            case model.page of
                PostView postView ->
                    let
                        ( newPostView, cmd ) =
                            PostView.update postMsg postView
                    in
                        ( { model | page = PostView newPostView }, Cmd.map PostViewMsg cmd )
                _ -> ( model, Cmd.none )
        TestPostViewMsg testMsg ->
            case model.page of
                TestPostView testView ->
                    let
                        ( newTestView, cmd ) =
                            TestPostView.update testMsg testView
                    in
                        ( { model | page = TestPostView newTestView }, Cmd.map TestPostViewMsg cmd )
                _ ->
                    ( model, Cmd.none )
        TestSearchViewMsg searchMsg ->
            case model.page of
                TestSearchView searchView ->
                    let
                        ( newSearchView, cmd ) =
                            TestSearchView.update searchMsg searchView
                    in
                        ( { model | page = TestSearchView newSearchView }, Cmd.map TestSearchViewMsg cmd)
                _ ->
                    ( model, Cmd.none )
        SearchViewMsg searchMsg ->
            case model.page of
                SearchView searchView ->
                    let
                        ( newSearchView, cmd ) =
                            SearchView.update searchMsg searchView
                    in
                        ( {model | page = SearchView newSearchView }, Cmd.map SearchViewMsg cmd )
                _ ->
                    ( model, Cmd.none )
        ChangePage f ->
            let
                ( newPage, newCmd ) =
                    f model
            in
                ( { model | page = newPage }, newCmd )
        NoOp ->
            ( model, Cmd.none )

-- Subscriptions

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none

-- Url Handling

onUrlRequest : UrlRequest -> Msg
onUrlRequest request =
    NoOp

onUrlChange : Url -> Msg
onUrlChange url =
    case Url.parse page url of
        Just f ->
            ChangePage f
        Nothing ->
            NoOp

-- View

view : Model -> Document Msg
view model =
    case model.page of
        EmptyPage ->
            Document "Comet" []
        PostView postView ->
            Html.map PostViewMsg (PostView.view postView)
                |> List.singleton
                |> Document (PostView.documentTitle postView)
        TestPostView testView ->
            Html.map TestPostViewMsg (TestPostView.view testView)
                |> List.singleton
                |> Document "Comet test page"
        TestSearchView searchView ->
            Html.map TestSearchViewMsg (TestSearchView.view searchView)
                |> List.singleton
                |> Document "Comet test page"
        SearchView searchView ->
            Html.map SearchViewMsg (SearchView.view searchView)
                |> List.singleton
                |> Document "Search"
