module CommentsView exposing (..)

import Comment exposing (Comment)
import Tuple exposing (first, second)
import Maybe exposing (withDefault)
import Html.Attributes as Attributes
import Loadable exposing (Loadable)
import KarmaMap exposing (KarmaMap)
import Html.Events as Events
import Html exposing (Html)
import Tags exposing (Tag)
import MarkdownCompose
import MarkdownOptions
import OrderContent
import Json.Encode
import VoteView
import Links
import Http

-- Putting the comment view and the comments view in their own modules would
-- create a dependency loop so they're both crammed in this module.

-- Comment view (singular)

-- Model

type alias SingleView = -- TODO: VoteView
    { replies : Replies
    , hash : String
    , comment : Loadable Comment
    , voteView : VoteView.Model
    , karmaMap : KarmaMap
    , replyComposeView : MarkdownCompose.Model
    , showReplyCompose : Bool
    , inTermsOf : Maybe (List Tag)
    }

type Replies
    = Replies Model
    | Unloaded

type SingleMsg
    = NoSingleOp
    | ReceiveComment Comment
    | RequestComment String
    | ReceiveSingleError
    | RepliesMsg Msg
    | VoteViewMsg VoteView.Msg
    | MarkdownComposeMsg MarkdownCompose.Msg
    | ToggleShowReplyCompose
    | ReceiveSingleInTermsOf (List Tag)

singleFromHash : KarmaMap -> String -> Maybe (List Tag) -> ( SingleView, Cmd SingleMsg )
singleFromHash karmaMap hash inTermsOf =
    let
        uninitialized =
            SingleView
                Unloaded
                ""
                Loadable.Unloaded
                (first (VoteView.fromHash karmaMap hash inTermsOf))
                karmaMap
                MarkdownCompose.init
                False
                inTermsOf
    in
        singleUpdate (RequestComment hash) uninitialized

-- Update

singleUpdate : SingleMsg -> SingleView -> ( SingleView, Cmd SingleMsg )
singleUpdate msg model =
    case msg of
        NoSingleOp ->
            ( model, Cmd.none )
        ReceiveComment comment ->
            let
                ( replies, repliesCmd ) =
                    fromHash model.karmaMap model.hash model.inTermsOf
                ( voteView, voteCmd ) =
                    VoteView.fromHash model.karmaMap model.hash model.inTermsOf
            in
                ( { model | comment = Loadable.Loaded comment, replies = Replies replies }
                , Cmd.batch
                    [ Cmd.map RepliesMsg repliesCmd
                    , Cmd.map VoteViewMsg voteCmd
                    ]
                )
        RequestComment hash ->
            let
                process result =
                    case result of
                        Ok res ->
                            ReceiveComment res
                        Err _ ->
                            ReceiveSingleError
                body =
                    Http.jsonBody (Json.Encode.string hash)
                request =
                    Http.post "/fn/comments/commentRead" body Comment.decoder
            in
                ( { model | hash = hash }, Http.send process request )
        ReceiveSingleError ->
            ( model, Cmd.none )
        RepliesMsg replyMsg ->
            case model.replies of
                Replies commentsView ->
                    let
                        ( newModel, cmd ) =
                            update replyMsg commentsView
                    in
                        ( { model | replies = Replies newModel }, Cmd.map RepliesMsg cmd )
                Unloaded ->
                    ( model, Cmd.none )
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
                            RequestComment model.hash
                    in
                        ( { model | replyComposeView = MarkdownCompose.init, showReplyCompose = False }
                        , Comment.createComment model.hash model.replyComposeView.input process
                        )
                _ ->
                    let
                        ( updatedComposeView, cmd ) =
                            MarkdownCompose.update composeMsg model.replyComposeView
                    in
                        ( { model | replyComposeView = updatedComposeView }, Cmd.map MarkdownComposeMsg cmd )
        ToggleShowReplyCompose ->
            ( { model | showReplyCompose = not model.showReplyCompose }, Cmd.none )
        ReceiveSingleInTermsOf inTermsOf ->
            let
                updatedReplies =
                    case model.replies of
                        Replies replies ->
                            Just (update (ReceiveInTermsOf inTermsOf) replies)
                        Unloaded ->
                            Nothing
                ( newReplies, cmds ) =
                    case updatedReplies of
                        Just ( r, c ) ->
                            ( Replies r
                            , Cmd.map RepliesMsg c
                            )
                        Nothing ->
                            ( Unloaded, Cmd.none )
                newModel =
                    { model
                    | inTermsOf = Just inTermsOf
                    , replies = newReplies
                    }
            in
                ( newModel, cmds )

-- View

viewSingle : SingleView -> Html SingleMsg
viewSingle model =
    Html.div [ Attributes.class "comment" ]
    (case model.comment of
        Loadable.Loaded entry ->
            let
                renderedReplies =
                    case model.replies of
                        Replies replies ->
                            Html.map RepliesMsg (view replies)
                        Unloaded ->
                            Html.text "Loading Comments"
            in
                [ Html.div [ Attributes.class "comment-left" ]
                    [ Html.map VoteViewMsg (VoteView.view model.voteView)
                    , Html.div [ Attributes.class "comment-side-bar" ] []
                    ]
                , Html.div [ Attributes.class "comment-right" ]
                    [ MarkdownOptions.safeRender [] entry.content
                    , Html.button
                        [ Attributes.class "btn"
                        , Attributes.class "btn-link"
                        , Events.onClick ToggleShowReplyCompose
                        ]
                        [ Html.text "Reply" ]
                    , if model.showReplyCompose then
                            Html.map MarkdownComposeMsg (MarkdownCompose.view model.replyComposeView)
                        else
                            Html.div [] []
                    , renderedReplies
                    ]
                ]
        Loadable.Unloaded ->
            []
    )

-- Comments View (plural)

-- Model

type alias Model =
    { comments : List SingleView
    , targetHash : String
    , karmaMap : KarmaMap
    , inTermsOf : Maybe (List Tag)
    }

type Msg
    = NoOp
    | SingleMsg SingleView SingleMsg
    | ReceiveComments (List ( SingleView, Cmd SingleMsg ))
    | RequestComments String
    | ReceiveError
    | ReceiveInTermsOf (List Tag)
    | Sort

fromHash : KarmaMap -> String -> Maybe (List Tag) -> ( Model, Cmd Msg )
fromHash karmaMap hash inTermsOf =
    let
        uninitialized =
            Model [] "" karmaMap inTermsOf
    in
        update (RequestComments hash) uninitialized

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
        ReceiveComments tuples ->
            let
                comments =
                    List.map first tuples
                commands =
                    List.map (\( comment, commentMsg ) -> Cmd.map (SingleMsg comment) commentMsg) tuples
            in
                ( { model | comments = comments }, Cmd.batch commands )
        SingleMsg commentView commentMsg ->
            let
                processComment comment tuple =
                    case first tuple of
                        Just commentCmd ->
                            ( Just commentCmd, comment :: (second tuple) )
                        Nothing ->
                            if comment.hash == commentView.hash
                            then
                                let
                                    updated = singleUpdate commentMsg comment
                                in
                                    ( Just (Cmd.map (SingleMsg (first updated)) (second updated))
                                    , (first updated) :: (second tuple)
                                    )
                            else
                                ( Nothing, comment :: (second tuple) )
                ( processCmd, unsortedComments ) =
                    List.foldr processComment ( Nothing, [] ) model.comments
                unsortedModel =
                    { model | comments = unsortedComments }
                ( sortedModel, sortCmd ) =
                    update Sort unsortedModel
            in
                ( sortedModel
                , Cmd.batch [ Maybe.withDefault Cmd.none processCmd, sortCmd ]
                )
        RequestComments hash ->
            let
                linkToCommentView link =
                    singleFromHash model.karmaMap link.hash model.inTermsOf
                process result =
                    case result of
                        Ok res ->
                            ReceiveComments (List.map linkToCommentView res)
                        Err _ ->
                            ReceiveError
                body =
                    Http.stringBody "" hash
                request =
                    Http.post "/fn/comments/fromHash" body (Links.decoder Comment.decoder)
            in
                ( { model | targetHash = hash }, Http.send process request )
        ReceiveError ->
            ( model, Cmd.none )
        ReceiveInTermsOf inTermsOf ->
            let
                newComments =
                    model.comments
                        |> List.map (singleUpdate (ReceiveSingleInTermsOf inTermsOf))
                newCommentsModels =
                    newComments
                        |> List.map Tuple.first
                newCommentsCmds =
                    newComments
                        |> List.map (\( m, c ) -> Cmd.map (SingleMsg m) c)
                        |> Cmd.batch
                newModel =
                    { model
                    | inTermsOf = Just inTermsOf
                    , comments = newCommentsModels
                    }
            in
                ( newModel, newCommentsCmds )
        Sort ->
            let
                sortedComments = -- TODO: Setting for how you want to sort things
                    model.comments
                        |> List.sortWith OrderContent.top
            in
                ( { model | comments = sortedComments }, Cmd.none ) -- TODO: Scroll to comment if its position changed

-- View

view : Model -> Html Msg
view model =
    let
        messages =
            List.map
                (\comment -> Html.map (SingleMsg comment) (viewSingle comment))
                model.comments
    in
        Html.div [ Attributes.class "comments" ]
        messages
