module Main exposing (..)

import SimpleKarmaMap exposing (simpleKarmaMap)
import Html exposing (Html)
import TestPostView
import PostView
import Browser

-- TODO: Update to using Browser.application
main : Program () Model Msg
main =
    Browser.element
        { init = \_ -> init
        , view = view
        , update = update
        , subscriptions = \_ -> Sub.none
        }

-- Model

type alias Model =
    { page : Page
    }

type Page
    = PostView PostView.Model
    | TestPostView TestPostView.Model
    --| TagView TagView.Model
    --| UserView UserView.Model
    | EmptyPage

type Msg
    = PostViewMsg PostView.Msg
    | TestPostViewMsg TestPostView.Msg
    --| TagViewMsg TagView.Msg
    --| UserViewMsg UserView.Msg
    | NoOp

init : ( Model, Cmd Msg )
init =
    let
        correctType tuple =
            ( Model (TestPostView (Tuple.first tuple))
            , Cmd.map TestPostViewMsg (Tuple.second tuple)
            )
    in
        correctType TestPostView.init

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
                    case testMsg of
                        TestPostView.SubmitInput ->
                            let
                                ( newPostView, cmd ) =
                                    PostView.fromHash simpleKarmaMap testView.input
                            in
                                ( { model | page = PostView newPostView }, Cmd.map PostViewMsg cmd )
                        _ ->
                            let
                                ( newTestView, cmd ) =
                                    TestPostView.update testMsg testView
                            in
                                ( { model | page = TestPostView newTestView }, Cmd.map TestPostViewMsg cmd )
                _ ->
                    ( model, Cmd.none )
        NoOp ->
            ( model, Cmd.none )

-- View

view : Model -> Html Msg
view model =
    case model.page of
        EmptyPage ->
            Html.div [] []
        PostView postView ->
            Html.map PostViewMsg (PostView.view postView)
        TestPostView testView ->
            Html.map TestPostViewMsg (TestPostView.view testView)
