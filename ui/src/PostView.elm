module PostView exposing (..)

import Tuple exposing (first, second)
import Html.Attributes as Attributes
import Loadable exposing (Loadable)
import Post exposing (Post)
import Html exposing (Html)
import MarkdownOptions
import CommentsView
import Json.Encode
import Http

-- Model

type alias Model =
    { post : Loadable Post
    , comments : CommentsView.Model
    , hash : String
    }

type Msg
    = NoOp
    | ReceivePost Post
    | RequestPost String
    | ReceiveError
    | CommentsViewMsg CommentsView.Msg


fromHash : String -> ( Model, Cmd Msg )
fromHash hash =
    let
        uninitialized =
            Model Loadable.Unloaded (first (CommentsView.fromHash hash)) ""
    in
        update (RequestPost hash) uninitialized

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
        ReceivePost post ->
            let
                correctType tuple =
                    ( first tuple
                    , Cmd.map CommentsViewMsg (second tuple)
                    )
                ( comments, cmd ) =
                    correctType (CommentsView.fromHash model.hash)
            in
                ( { model | post = Loadable.Loaded post, comments = comments }, cmd )
        RequestPost hash ->
            let
                process result =
                    case result of
                        Ok res ->
                            ReceivePost res
                        Err _ ->
                            ReceiveError    
                body =
                    Http.jsonBody (Json.Encode.string hash)
                request =
                    Http.post "/fn/posts/postRead" body Post.decoder
            in
                ( { model | hash = hash }, Http.send process request )
        ReceiveError ->
            ( model, Cmd.none )
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
        Loadable.Loaded entry ->
            [ Html.h1 [ Attributes.class "post-title" ] [ Html.text entry.title ]
            , MarkdownOptions.safeRender [ Attributes.class "post-content" ] entry.content
            , Html.map CommentsViewMsg (CommentsView.view model.comments)
            ]
        Loadable.Unloaded ->
            []
    )