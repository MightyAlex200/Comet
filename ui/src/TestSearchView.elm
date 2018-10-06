module TestSearchView exposing (..)

import Browser.Navigation as Navigation exposing (Key)
import Html.Events as Events
import Html exposing (Html)

-- Model

type alias Model =
    { input : String
    , key : Key
    }

type Msg
    = NoOp
    | UpdateInput String
    | Submit

init : Key -> ( Model, Cmd Msg )
init key =
    ( Model "" key, Cmd.none )

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
        UpdateInput input ->
            ( { model | input = input }, Cmd.none )
        Submit ->
            let
                url =
                    "/search/" ++ model.input
                cmd =
                    Navigation.pushUrl model.key url
            in
                ( model, cmd )

-- View

view : Model -> Html Msg
view model =
    Html.div
        []
        [ Html.input [ Events.onInput UpdateInput ] []
        , Html.button [ Events.onClick Submit ] [ Html.text "Submit" ]
        ]
