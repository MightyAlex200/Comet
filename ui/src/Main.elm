import Html exposing (..)
import Html.Events as Events

main =
    Html.beginnerProgram { model = model, update = update, view = view }

-- Model

type Msg = Increment | Decrement

type alias Model = Int

model : Model
model = 0

-- Update

update : Msg -> Model -> Model
update msg model =
    case msg of
        Increment ->
            model + 1
        Decrement ->
            model - 1

-- View
view : Model -> Html Msg
view model =
    div []
    [ button [ Events.onClick Increment ] [ text "+" ]
    , p [] [ text (toString model) ]
    , button [ Events.onClick Decrement ] [ text "-" ]
    ]
