module CommentsView exposing (..)

import Comment exposing (Comment)
import Tuple exposing (first, second)
import Maybe exposing (withDefault)
import Html exposing (Html)
import MarkdownOptions
import Json.Encode
import Json.Decode
import Http

-- Putting the comment view and the comments view in their own modules would
-- create a dependency loop so they're both crammed in this module.

-- Comment view (singular)

-- Model

type alias SingleView =
    { comment : Comment
    }

type SingleMsg
    = NoSingleOp
    | RecieveComment Comment
    | RequestComment String
    | RecieveSingleError

singleInit : ( SingleView, Cmd SingleMsg )
singleInit =
    ( SingleView Comment.Unloaded, Cmd.none )

-- Update

singleUpdate : SingleMsg -> SingleView -> ( SingleView, Cmd SingleMsg )
singleUpdate msg model =
    case msg of
        NoSingleOp ->
            ( model, Cmd.none )
        RecieveComment comment ->
            ( { model | comment = comment }, Cmd.none )
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
                ( model, Http.send process request )
        RecieveSingleError ->
            ( { model | comment = Comment.Error "Error loading comment" }, Cmd.none )

-- View

viewSingle : SingleView -> Html SingleMsg
viewSingle model =
    Html.div []
    (case model.comment of
        Comment.Loaded entry -> 
            [ MarkdownOptions.safeRender [] entry.content
            -- TODO: CommentsView
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
    | RecieveComments (List SingleView)
    | RequestComments String
    | RecieveError

init : ( Model, Cmd Msg )
init =
    ( Model [] Nothing, Cmd.none )

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
        RecieveComments comments ->
            ( { model | comments = comments }, Cmd.none )
        SingleMsg view msg ->
            let
                processComment comment tuple =
                    case first tuple of
                        Just cmd ->
                            ( Just cmd, comment :: (second tuple) )
                        Nothing ->
                            if comment == view
                            then
                                let
                                    updated = singleUpdate msg comment
                                in
                                    ( Just (Cmd.map (SingleMsg (first updated)) (second updated))
                                    , (first updated) :: (second tuple)
                                    )
                            else
                                ( Nothing, comment :: (second tuple) )
                (cmd, updatedComments) =
                    List.foldr processComment ( Nothing, [] ) model.comments
            in
                ( { model | comments = updatedComments }
                , withDefault Cmd.none cmd
                )
        RequestComments hash ->
            let
                process result =
                    case result of
                        Ok res ->
                            RecieveComments (List.map SingleView res)
                        Err _ ->
                            RecieveError
                body =
                    Http.jsonBody (Json.Encode.string hash)
                request =
                    Http.post "/fn/comments/fromHash" body (Json.Decode.list Comment.decoder)
            in
                ( { model | targetHash = Just hash }, Http.send process request )
        RecieveError ->
            ( { model | targetHash = Nothing }, Cmd.none )

-- View

view : Model -> Html Msg
view model =
    Html.div []
    []
