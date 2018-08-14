module Main exposing (..)

import Html exposing (Html)
import PostView

-- Model

type alias Model =
    { page : Page
    }

type Page
    = PostView PostView.Model
    --| TagView TagView.Model
    --| UserView UserView.Model
    | EmptyPage

type Msg
    = PostViewMsg PostView.Msg
    --| TagViewMsg TagView.Msg
    --| UserViewMsg UserView.Msg
    | NoOp

init : ( Model, Cmd Msg )
init =
    ( Model EmptyPage, Cmd.none )

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        PostViewMsg msg ->
            case model.page of
                PostView postView ->
                    let
                        ( newPostView, cmd ) =
                            PostView.update msg postView
                    in
                        ( { model | page = PostView newPostView }, Cmd.map PostViewMsg cmd )
                _ -> ( model, Cmd.none )
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
