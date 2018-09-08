module TestPostView exposing (..)

import Browser.Navigation as Navigation exposing (Key)
import Html.Events as Events
import Html exposing (Html)

-- Model

type alias Model =
    { input : String
    , inTermsOf : String
    , key : Key
    }

type Msg
    = NoOp
    | UpdateInTermsOf String
    | UpdateInput String
    | SubmitInput

init : Key -> ( Model, Cmd Msg )
init key =
    ( Model "" "" key, Cmd.none )

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
        UpdateInTermsOf inTermsOf ->
            ( { model | inTermsOf = inTermsOf }, Cmd.none )
        UpdateInput input ->
            ( { model | input = input }, Cmd.none )
        SubmitInput ->
            let
                inTermsOfQuery =
                    case model.inTermsOf of
                        "" ->
                            ""
                        _ ->
                            "?inTermsOf=" ++ model.inTermsOf
            in
                ( model, Navigation.pushUrl model.key ("/post/" ++ model.input ++ inTermsOfQuery) )

-- View

view : Model -> Html Msg
view model =
    Html.div []
    [ Html.input [ Events.onInput UpdateInput ] []
    , Html.input [ Events.onInput UpdateInTermsOf ] []
    , Html.button [ Events.onClick SubmitInput ] [ Html.text "Submit" ]
    ]
