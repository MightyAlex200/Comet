module PostView exposing (..)

import Tuple exposing (first, second)
import Html.Attributes as Attributes
import Post exposing (Post)
import Html exposing (Html)
import MarkdownOptions
import CommentsView
import Json.Encode
import Http

-- Model

type alias Model =
    { post : Post
    , comments : CommentsView.Model
    , hash : String
    }

type Msg
    = NoOp
    | RecievePost Post
    | RequestPost String
    | RecieveError
    | CommentsViewMsg CommentsView.Msg

init : ( Model, Cmd Msg )
init =
    ( Model Post.Unloaded (first CommentsView.init) "", Cmd.none )

fromHash : String -> ( Model, Cmd Msg )
fromHash hash =
    update (RequestPost hash) (Model Post.Unloaded (first CommentsView.init) hash)

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
        RecievePost post ->
            let
                correctType tuple =
                    ( first tuple
                    , Cmd.map CommentsViewMsg (second tuple)
                    )
                ( comments, cmd ) =
                    correctType (CommentsView.fromHash model.hash)
            in
                ( { model | post = post, comments = comments }, cmd )
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
        CommentsViewMsg msg ->
            let
                correctType tuple =
                    ( first tuple
                    , Cmd.map CommentsViewMsg (second tuple)
                    )
                ( updatedComments, cmd ) =
                    correctType (CommentsView.update msg model.comments)
            in
                ( { model | comments = updatedComments }, cmd )

-- View

view : Model -> Html Msg
view model =
    Html.div [ Attributes.class "post" ]
    (case model.post of
        Post.Loaded entry ->
            [ Html.h1 [ Attributes.class "post-title" ] [ Html.text entry.title ]
            , MarkdownOptions.safeRender [ Attributes.class "post-content" ] entry.content
            , Html.map CommentsViewMsg (CommentsView.view model.comments)
            ]
        Post.Unloaded ->
            []
        Post.Error error ->
            [ Html.text error ]
    )