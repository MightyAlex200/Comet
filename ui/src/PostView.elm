module PostView exposing (..)

import Tuple exposing (first, second)
import Html.Attributes as Attributes
import Loadable exposing (Loadable)
import Html.Events as Events
import Post exposing (Post)
import Html exposing (Html)
import MarkdownOptions
import MarkdownCompose
import CommentsView
import Json.Encode
import VoteView
import Comment
import Http

-- Model

type alias Model =
    { post : Loadable Post
    , comments : CommentsView.Model
    , voteView : VoteView.Model
    , hash : String
    , karmaMap : String -> Float
    , replyComposeView : MarkdownCompose.Model
    , showReplyCompose : Bool
    }

type Msg
    = NoOp
    | ReceivePost Post
    | RequestPost String
    | ReceiveError
    | CommentsViewMsg CommentsView.Msg
    | VoteViewMsg VoteView.Msg
    | MarkdownComposeMsg MarkdownCompose.Msg
    | ToggleShowReplyCompose
    -- TODO: UpdateKarmaMap Msg

fromHash : (String -> Float) -> String -> ( Model, Cmd Msg )
fromHash karmaMap hash =
    let
        uninitialized =
            Model
                Loadable.Unloaded
                (first (CommentsView.fromHash karmaMap hash))
                (first (VoteView.fromHash karmaMap hash))
                ""
                karmaMap
                MarkdownCompose.init
                False
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
                    CommentsView.fromHash model.karmaMap model.hash
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
        CommentsViewMsg commentsMsg ->
            let
                correctType tuple =
                    ( first tuple
                    , Cmd.map CommentsViewMsg (second tuple)
                    )
                ( updatedComments, cmd ) =
                    correctType (CommentsView.update commentsMsg model.comments)
            in
                ( { model | comments = updatedComments }, cmd )
        VoteViewMsg voteMsg ->
            let
                ( updatedVoteView, cmd ) =
                    VoteView.update voteMsg model.voteView
            in
                ( { model | voteView = updatedVoteView }, Cmd.map VoteViewMsg cmd )
        MarkdownComposeMsg composeMsg ->
            case composeMsg of
                MarkdownCompose.SubmitInput ->
                    let
                        process result =
                            CommentsViewMsg (CommentsView.RequestComments model.hash)
                    in
                        ( { model | replyComposeView = MarkdownCompose.init, showReplyCompose = False }
                        , Comment.createComment model.hash model.replyComposeView.input process
                        )
                _ ->
                    let
                        ( updatedComposeView, cmd ) =
                            MarkdownCompose.update composeMsg model.replyComposeView
                    in
                        ( { model | replyComposeView = updatedComposeView }, Cmd.map MarkdownComposeMsg cmd  )
        ToggleShowReplyCompose ->
            ( { model | showReplyCompose = not model.showReplyCompose }, Cmd.none )

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
            , Html.button
                [ Attributes.class "btn"
                , Attributes.class "btn-link"
                , Attributes.class "reply-button"
                , Events.onClick ToggleShowReplyCompose
                ]
                [ Html.text "Reply" ]
            , if model.showReplyCompose then
                    Html.map MarkdownComposeMsg (MarkdownCompose.view model.replyComposeView)
                else
                    Html.div [] []
            , Html.hr [] []
            , Html.map CommentsViewMsg (CommentsView.view model.comments)
            ]
        Loadable.Unloaded ->
            []
    )