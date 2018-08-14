module PostView exposing (..)

import Post exposing (Post)
import Html exposing (Html)
import Json.Encode
import Http

-- Model

type alias Model =
    { post : Post
    , replyInput : String
    , hash : String
    }

type Msg
    = NoOp
    | UpdateInput String
    | RecievePost Post
    | RequestPost String
    | RecieveError -- TODO: Capture error

init : ( Model, Cmd Msg )
init =
    ( Model Post.empty "" "", Cmd.none )

errorPost : Post
errorPost =
    Post "Error loading post" "There was an error loading this post"

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
        UpdateInput input ->
            ( { model | replyInput = input }, Cmd.none )
        RecievePost post ->
            ( { model | post = post }, Cmd.none )
        RequestPost hash ->
            let
                process result =
                    case result of
                        Ok res ->
                            RecievePost res
                        Err _ ->
                            NoOp
                body =
                    Http.jsonBody (Json.Encode.string hash)
                request =
                    Http.post "/fn/post/postRead" body Post.decoder
            in
                ( { model | hash = hash }, Http.send process request )
        RecieveError ->
            ( { model | post = errorPost }, Cmd.none )

-- View

view : Model -> Html Msg
view model =
    Html.div []
    [ Html.h1 [] [ Html.text model.post.title ]
    , Html.p [] [ Html.text model.post.content ]
    ]