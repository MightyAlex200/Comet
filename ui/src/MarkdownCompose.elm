module MarkdownCompose exposing (..)

import Html.Attributes as Attributes
import Html.Events as Events
import Html exposing (Html)
import MarkdownOptions

-- Model

type alias Model =
    { input : String
    }

type Msg
    = NoOp
    | UpdateInput String
    | SubmitInput

init : Model
init =
    Model ""

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
        SubmitInput -> -- to be handled by others
            ( model, Cmd.none )
        UpdateInput input ->
            ( { model | input = input }, Cmd.none )

-- View

view : Model -> Html Msg
view model =
    Html.div [ Attributes.class "compose" ]
    [ Html.div [ Attributes.class "row" ]
        [ Html.div
            [ Attributes.class "compose-left"
            , Attributes.class "col-lg-6"
            ]
            [ Html.textarea
                [ Attributes.class "compose-textarea"
                , Attributes.class "form-control"
                , Events.onInput UpdateInput
                ]
                []
            ]
        , MarkdownOptions.safeRender
            [ Attributes.class "compose-preview"
            , Attributes.class "col-lg-6"
            ]
            model.input
        ]
    , Html.button
        [ Events.onClick SubmitInput
        , Attributes.class "compose-submit"
        , Attributes.class "btn"
        , Attributes.class "btn-primary"
        ]
        [ Html.text "Submit" ]
    ]
