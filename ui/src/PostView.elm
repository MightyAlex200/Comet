module PostView exposing (..)

import Tuple exposing (first, second)
import Html.Attributes as Attributes
import Loadable exposing (Loadable)
import Post exposing (Post)
import Html exposing (Html)
import MarkdownOptions
import CommentsView
import Json.Encode
import VoteView
import Http

-- Model

type alias Model =
    { post : Loadable Post
    , comments : CommentsView.Model
    , voteView : VoteView.Model
    , hash : String
    , karmaMap : String -> Float
    }

type Msg
    = NoOp
    | ReceivePost Post
    | RequestPost String
    | ReceiveError
    | CommentsViewMsg CommentsView.Msg
    | VoteViewMsg VoteView.Msg
    -- TODO: UpdateKarmaMap Msg

fromHash : (String -> Float) -> String -> ( Model, Cmd Msg )
fromHash karmaMap hash =
    let
        uninitialized =
            Model
                Loadable.Unloaded
                (first (CommentsView.fromHash hash))
                (first (VoteView.fromHash karmaMap hash))
                ""
                karmaMap
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
                ( comments, commentCmd ) =
                    CommentsView.fromHash model.hash
                ( voteView, voteCmd ) =
                    VoteView.fromHash model.karmaMap model.hash
                cmds =
                    Cmd.batch
                    [ Cmd.map CommentsViewMsg commentCmd
                    , Cmd.map VoteViewMsg voteCmd
                    ]
            in
                ( { model
                    | post = Loadable.Loaded post
                    , comments = comments
                    , voteView = voteView
                    }
                , cmds
                )
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
        VoteViewMsg msg ->
            let
                ( updatedVoteView, cmd ) =
                    VoteView.update msg model.voteView
            in
                ( { model | voteView = updatedVoteView }, Cmd.map VoteViewMsg cmd )

-- View

view : Model -> Html Msg
view model =
    Html.div [ Attributes.class "post-container" ]
    (case model.post of
        Loadable.Loaded entry ->
            [ Html.div [ Attributes.class "post-vote-container" ] 
                [ Html.map VoteViewMsg (VoteView.view model.voteView)
                , Html.div [ Attributes.class "post" ]
                    [ Html.h1 [ Attributes.class "post-title" ] [ Html.text entry.title ]
                    , MarkdownOptions.safeRender [ Attributes.class "post-content" ] entry.content
                    ]
                ]
            , Html.map CommentsViewMsg (CommentsView.view model.comments)
            ]
        Loadable.Unloaded ->
            []
    )