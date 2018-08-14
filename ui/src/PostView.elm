module PostView exposing (..)

import Post exposing (Post)
import Html exposing (Html)
import MarkdownOptions
import Json.Encode
import Http

-- Model

type alias Model =
    { post : Post
    , hash : String
    }

type Msg
    = NoOp
    | RecievePost Post
    | RequestPost String
    | RecieveError

init : ( Model, Cmd Msg )
init =
    ( Model Post.Unloaded "", Cmd.none )

fromHash : String -> ( Model, Cmd Msg )
fromHash hash =
    update (RequestPost hash) (Model Post.Unloaded hash)

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
        RecievePost post ->
            ( { model | post = post }, Cmd.none )
        RequestPost hash ->
            let
                process result =
                    case result of
                        Ok res ->
                            RecievePost res
                        Err _ ->
                            RecieveError    
                body =
                    Http.jsonBody (Json.Encode.string hash)
                request =
                    Http.post "/fn/posts/postRead" body Post.decoder
            in
                ( { model | hash = hash }, Http.send process request )
        RecieveError ->
            ( { model | post = Post.Error "Error loading post" }, Cmd.none )

-- View

view : Model -> Html Msg
view model =
    Html.div []
    (case model.post of
        Post.Loaded entry ->
            [ Html.h1 [] [ Html.text entry.title ]
            , MarkdownOptions.safeRender [] entry.content
            ]
        Post.Unloaded ->
            []
        Post.Error error ->
            [ Html.text error ]
    )