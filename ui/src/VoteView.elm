module VoteView exposing (..)

import Html.Attributes as Attributes
import Links exposing (Links)
import Json.Encode as Encode
import Json.Decode as Decode
import Vote exposing (Vote)
import Html exposing (Html)
import Http

-- Model

type alias Model =
    { targetHash : String
    , value : Float
    , score : Float
    , karmaMap : String -> Float
    }

type Msg
    = NoOp
    | SendVote Vote
    | RequestVote
    | ReceiveVote Vote
    | RequestVotes
    | ReceiveVotes (Links Vote)
    | ReceiveError

fromHash : (String -> Float) -> String -> ( Model, Cmd Msg )
fromHash karmaMap hash =
    let
        uninitialized =
            Model hash 0 0 karmaMap
        ( requestedVote, voteCmd ) =
            update RequestVote uninitialized
        ( requestedVotes, votesCmd ) =
            update RequestVotes requestedVote
        cmd =
            Cmd.batch
            [ voteCmd
            , votesCmd
            ]
    in
        ( requestedVotes, cmd )

voteToValue : Vote -> Float
voteToValue vote =
    let
        sign =
            if vote.isPositive then
                1
            else
                -1
    in
        sign * vote.fraction

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
        SendVote vote ->
            let
                body =
                    Encode.object
                    [ ("targetHash", Encode.string model.targetHash)
                    , ("voteEntry", Vote.encode vote)
                    ]
                request =
                    Http.post "/fn/votes/vote" (Http.jsonBody body) (Decode.succeed Nothing)
                handle _ =
                    RequestVotes
            in
                ( model, Http.send handle request )
        RequestVotes ->
            let
                body =
                    Http.stringBody "" model.targetHash
                request =
                    Http.post "/fn/votes/fromHash" body (Links.decoder Vote.decoder)
                handle result =
                    case result of
                        Ok links ->
                            ReceiveVotes links
                        Err _ ->
                            ReceiveError
            in
                ( model, Http.send handle request )
        ReceiveVotes votes ->
            let -- needed to juggle some values here, value is unused until multiplied
                sources =
                    List.map (\vote -> ( vote.source, voteToValue vote.entry )) votes
                weighted =
                    List.map (\( source, value ) -> ( model.karmaMap source, value )) sources
                multiplied =
                    List.map (\( weight, value ) -> weight * value) weighted
                newScore =
                    List.sum multiplied
            in
                ( { model | score = newScore }, Cmd.none )
        RequestVote ->
            let
                body =
                    Http.jsonBody (Encode.string model.targetHash)
                request =
                    Http.post "/fn/votes/myVote" body Vote.decoder
                handle result =
                    case result of
                        Ok vote ->
                            ReceiveVote vote
                        Err _ ->
                            ReceiveError
            in
                ( model, Http.send handle request )
        ReceiveVote vote ->
            ( { model | value = voteToValue vote}, Cmd.none )
        ReceiveError ->
            ( model, Cmd.none )

-- View

view : Model -> Html Msg
view model = -- todo
    Html.div [ Attributes.class "vote-view" ]
    [ Html.text (toString model.score) ]