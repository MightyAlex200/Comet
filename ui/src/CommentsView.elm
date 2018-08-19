module CommentsView exposing (..)

import Comment exposing (Comment)
import Tuple exposing (first, second)
import Maybe exposing (withDefault)
import Html.Attributes as Attributes
import Loadable exposing (Loadable)
import Html exposing (Html)
import MarkdownOptions
import Json.Encode
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

singleFromHash : String -> ( SingleView, Cmd SingleMsg )
singleFromHash hash =
    let
        uninitialized =
            SingleView Unloaded "" Loadable.Unloaded
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
                correctType tuple =
                    -- from ( Model, Cmd Msg ) to ( Replies, Cmd SingleMsg )
                    ( Replies (first tuple)
                    , Cmd.map RepliesMsg (second tuple)
                    )
                ( replies, cmd ) =
                    (fromHash >> correctType) model.hash
            in
                ( { model | comment = Loadable.Loaded comment, replies = replies }, cmd )
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
        RepliesMsg msg ->
            case model.replies of
                Replies commentsView ->
                    let
                        ( newModel, cmd ) =
                            update msg commentsView
                    in
                        ( { model | replies = Replies newModel }, Cmd.map RepliesMsg cmd )
                Unloaded ->
                    ( model, Cmd.none )

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
                    [ Html.div [ Attributes.class "comment-side-bar" ] [] ]
                , Html.div [ Attributes.class "comment-right" ]
                    [ MarkdownOptions.safeRender [] entry.content
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
    }

type Msg
    = NoOp
    | SingleMsg SingleView SingleMsg
    | ReceiveComments (List ( SingleView, Cmd SingleMsg ))
    | RequestComments String
    | ReceiveError

fromHash : String -> ( Model, Cmd Msg )
fromHash hash =
    let
        uninitialized =
            Model [] ""
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
                    List.map (\( comment, msg ) -> Cmd.map (SingleMsg comment) msg) tuples
            in
                ( { model | comments = comments }, Cmd.batch commands )
        SingleMsg view msg ->
            let
                processComment comment tuple =
                    case first tuple of
                        Just cmd ->
                            ( Just cmd, comment :: (second tuple) )
                        Nothing ->
                            if comment.hash == view.hash
                            then
                                let
                                    updated = singleUpdate msg comment
                                in
                                    ( Just (Cmd.map (SingleMsg (first updated)) (second updated))
                                    , (first updated) :: (second tuple)
                                    )
                            else
                                ( Nothing, comment :: (second tuple) )
                ( cmd, updatedComments ) =
                    List.foldr processComment ( Nothing, [] ) model.comments
            in
                ( { model | comments = updatedComments }
                , withDefault Cmd.none cmd
                )
        RequestComments hash ->
            let
                linkToCommentView link =
                    singleFromHash link.hash
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
