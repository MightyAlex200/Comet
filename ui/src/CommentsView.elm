module CommentsView exposing (..)

import Comment exposing (Comment)
import Tuple exposing (first, second)
import Maybe exposing (withDefault)
import Html exposing (Html)
import MarkdownOptions
import Json.Encode
import Links
import Http

-- Putting the comment view and the comments view in their own modules would
-- create a dependency loop so they're both crammed in this module.

-- Comment view (singular)

-- Model

type alias SingleView =
    { replies : Replies
    , hash : Maybe String
    , comment : Comment
    }

type Replies
    = Replies Model
    | Unloaded

type SingleMsg
    = NoSingleOp
    | RecieveComment Comment
    | RequestComment String
    | RecieveSingleError
    | RepliesMsg Msg

singleInit : ( SingleView, Cmd SingleMsg )
singleInit =
    ( SingleView Unloaded Nothing Comment.Unloaded, Cmd.none )

-- Update

singleUpdate : SingleMsg -> SingleView -> ( SingleView, Cmd SingleMsg )
singleUpdate msg model =
    case msg of
        NoSingleOp ->
            ( model, Cmd.none )
        RecieveComment comment ->
            let
                correctType tuple =
                    -- from ( Model, Cmd Msg ) to ( Replies, Cmd SingleMsg )
                    ( Replies (first tuple)
                    , Cmd.map RepliesMsg (second tuple)
                    )
                ( replies, cmd ) =
                    withDefault ( Unloaded, Cmd.none )
                    (Maybe.map (fromHash >> correctType) model.hash)
            in
                ( { model | comment = comment, replies = replies }, cmd )
        RequestComment hash ->
            let
                process result =
                    case result of
                        Ok res ->
                            RecieveComment res
                        Err _ ->
                            RecieveSingleError
                body =
                    Http.jsonBody (Json.Encode.string hash)
                request =
                    Http.post "/fn/comments/commentRead" body Comment.decoder
            in
                ( { model | hash = Just hash }, Http.send process request )
        RecieveSingleError ->
            ( { model | comment = Comment.Error "Error loading comment" }, Cmd.none )
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
    Html.div []
    (case model.comment of
        Comment.Loaded entry ->
            let
                renderedReplies =
                    case model.replies of
                        Replies replies ->
                            Html.map RepliesMsg (view replies)
                        Unloaded ->
                            Html.text "Loading Comments"
            in
                [ MarkdownOptions.safeRender [] entry.content
                , renderedReplies
                ]
        Comment.Unloaded ->
            []
        Comment.Error error ->
            [ Html.text error ]
    )

-- Comments View (plural)

-- Model

type alias Model =
    { comments : List SingleView
    , targetHash : Maybe String
    }

type Msg
    = NoOp
    | SingleMsg SingleView SingleMsg
    | RecieveComments (List ( SingleView, Cmd SingleMsg ))
    | RequestComments String
    | RecieveError

init : ( Model, Cmd Msg )
init =
    ( Model [] Nothing, Cmd.none )

fromHash : String -> ( Model, Cmd Msg )
fromHash hash =
    update (RequestComments hash) (first init)

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
        RecieveComments tuples ->
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
                    singleUpdate (RequestComment link.hash) (first singleInit)
                process result =
                    case result of
                        Ok res ->
                            RecieveComments (List.map linkToCommentView res)
                        Err _ ->
                            RecieveError
                body =
                    Http.stringBody "" hash
                request =
                    Http.post "/fn/comments/fromHash" body (Links.decoder Comment.decoder)
            in
                ( { model | targetHash = Just hash }, Http.send process request )
        RecieveError ->
            ( { model | targetHash = Nothing }, Cmd.none )

-- View

view : Model -> Html Msg
view model =
    let
        messages =
            List.map
                (\comment -> Html.map (SingleMsg comment) (viewSingle comment))
                model.comments
    in
        Html.div []
        messages
