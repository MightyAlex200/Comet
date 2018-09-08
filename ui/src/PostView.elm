module PostView exposing (..)

import Tuple exposing (first, second)
import Html.Attributes as Attributes
import Loadable exposing (Loadable)
import KarmaMap exposing (KarmaMap)
import Json.Decode as Decode
import Html.Events as Events
import Post exposing (Post)
import Html exposing (Html)
import Tags exposing (Tag)
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
    , karmaMap : KarmaMap
    , replyComposeView : MarkdownCompose.Model
    , showReplyCompose : Bool
    , inTermsOf : Maybe (List Tag)
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
    | ReceiveInTermsOf (List Tag)
    -- TODO: UpdateKarmaMap Msg

fromHash : KarmaMap -> String -> Maybe (List Tag) -> ( Model, Cmd Msg )
fromHash karmaMap hash inTermsOf =
    let
        uninitialized =
            Model
                Loadable.Unloaded
                (first (CommentsView.fromHash karmaMap hash inTermsOf))
                (first (VoteView.fromHash karmaMap hash inTermsOf))
                ""
                karmaMap
                MarkdownCompose.init
                False
                inTermsOf
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
                    CommentsView.fromHash model.karmaMap model.hash model.inTermsOf
                ( voteView, voteCmd ) =
                    VoteView.fromHash model.karmaMap model.hash model.inTermsOf
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
                postProcess result =
                    case result of
                        Ok res ->
                            ReceivePost res
                        Err _ ->
                            ReceiveError    
                postBody =
                    Http.jsonBody (Json.Encode.string hash)
                postRequest =
                    Http.post "/fn/posts/postRead" postBody Post.decoder
                postCmd =
                    Http.send postProcess postRequest
                inTermsOfProcess result =
                    case result of
                        Ok res ->
                            ReceiveInTermsOf res
                        Err _ ->
                            NoOp
                inTermsOfBody =
                    Http.stringBody "" hash
                inTermsOfRequest =
                    Http.post "/fn/posts/defaultTags" inTermsOfBody (Decode.list Decode.int)
                inTermsOfCmd =
                    Http.send inTermsOfProcess inTermsOfRequest
                cmds =
                    Cmd.batch
                        [ postCmd
                        , inTermsOfCmd
                        ]
            in
                ( { model | hash = hash }, cmds )
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
        ReceiveInTermsOf inTermsOf ->
            case model.inTermsOf of
                Just _ ->
                    ( model, Cmd.none )
                Nothing ->
                    let
                        ( newComments, commentCmd ) =
                            CommentsView.update (CommentsView.ReceiveInTermsOf inTermsOf) model.comments
                        ( newVoteView, voteCmd ) =
                            VoteView.update (VoteView.ReceiveInTermsOf inTermsOf) model.voteView
                        newModel =
                            { model
                            | inTermsOf = Just inTermsOf
                            , comments = newComments
                            , voteView = newVoteView
                            }
                        cmds =
                            Cmd.batch
                                [ Cmd.map CommentsViewMsg commentCmd
                                , Cmd.map VoteViewMsg voteCmd
                                ]
                    in
                        ( newModel, cmds )

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

documentTitle : Model -> String
documentTitle model =
    case model.post of
        Loadable.Loaded { title } ->
            "\"" ++ title ++ "\" on Comet"
        _ ->
            "Comet"
