module TestPostView exposing (..)

import Html.Events as Events
import Html exposing (Html)

-- Model

type alias Model =
    { input : String
    }

type Msg
    = NoOp
    | UpdateInput String
    | SubmitInput

init : ( Model, Cmd Msg )
init =
    ( Model "", Cmd.none )

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
        UpdateInput input ->
            ( { model | input = input }, Cmd.none )
        SubmitInput -> -- To be handled others
            ( model, Cmd.none )

-- View

view : Model -> Html Msg
view model =
    Html.div []
    [ Html.input [ Events.onInput UpdateInput ] []
    , Html.button [ Events.onClick SubmitInput ] [ Html.text "Submit" ]
    ]
