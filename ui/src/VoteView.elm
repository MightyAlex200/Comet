module VoteView exposing
    ( Model
    , Msg
    , fromHash
    , voteToValue
    , valueToVote
    , update
    , view
    )

import Html.Attributes as Attributes
import Links exposing (Links, Link)
import Json.Encode as Encode
import Json.Decode as Decode
import Html.Events as Events
-- import FeatherIcons as Icons
import Vote exposing (Vote)
import Html exposing (Html)
import Http

-- Model

-- How many sections the vote buttons are split up into
voteSectionCount : Int
voteSectionCount =
    10

type alias Model =
    { targetHash : String
    , value : Float
    , score : Float
    , karmaMap : String -> Float
    }

type Msg
    = NoOp
    | SendVote Vote
    | RequestAll
    | RequestVote
    | ReceiveVote (Link Vote)
    | RequestVotes
    | ReceiveVotes (Links Vote)
    | ReceiveError

fromHash : (String -> Float) -> String -> ( Model, Cmd Msg )
fromHash karmaMap hash =
    let
        uninitialized =
            Model hash 0 0 karmaMap
    in
        update RequestAll uninitialized

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

valueToVote : Float -> Vote
valueToVote value =
    Vote (value > 0) (abs value)

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
                    RequestAll
            in
                ( model, Http.send handle request )
        RequestAll ->
            let
                ( requestedVotes, votesCmd ) =
                    update RequestVotes model
                ( requestedVote, voteCmd ) =
                    update RequestVote requestedVotes
            in
                ( requestedVote, Cmd.batch [ votesCmd, voteCmd ] )
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
                    Http.post "/fn/votes/myVote" body (Links.linkDecoder Vote.decoder)
                handle result =
                    case result of
                        Ok vote ->
                            ReceiveVote vote
                        Err _ ->
                            ReceiveError
            in
                ( model, Http.send handle request )
        ReceiveVote vote ->
            ( { model | value = voteToValue vote.entry }, Cmd.none )
        ReceiveError ->
            ( model, Cmd.none )

-- View

getClip : Bool -> Float -> String
getClip fromTop value =
    let
        points =
            if fromTop then
                let
                    adjustedValue =
                        clamp 0 1 value
                    top =
                        String.fromFloat ((1 - adjustedValue) * 100)
                in
                    "0% " ++ top ++ "%, 100% " ++ top ++ "%, 100% 100%, 0% 100%"
            else
                let
                    adjustedValue =
                        clamp 0 1 (negate value)
                    bottom =
                        String.fromFloat (adjustedValue * 100)
                in
                    "0% 0%, 100% 0%, 100% " ++ bottom ++ "%, 0% " ++ bottom ++ "%"
    in
        "polygon(" ++ points ++ ")"

voteSections : Bool -> Html Msg
voteSections isPositive =
    Html.div
    [ Attributes.class "vote-sections" ]
    ((List.range 0 voteSectionCount)
        |> List.map
            (\offset ->
                let
                    value =
                        if isPositive then
                            toFloat (voteSectionCount - offset) / toFloat voteSectionCount
                        else
                            toFloat offset / toFloat voteSectionCount
                in
                    Html.div
                    [ Attributes.class "vote-section"
                    , Attributes.style "top" (String.fromFloat ((toFloat offset) * 24 / (toFloat voteSectionCount)))
                    , Attributes.style "height" (String.fromFloat (24 / (toFloat voteSectionCount)))
                    , Events.onClick
                        (value
                            |> Vote isPositive
                            |> SendVote
                        )
                    ]
                    []
            )
    )

voteButton : Bool -> Float -> Html Msg
voteButton isPositive value =
    let
        -- icon =
        --     if isPositive then
        --         Icons.arrowUp
        --     else
        --         Icons.arrowDown
        class =
            if isPositive then
                "upvote-representation"
            else
                "downvote-representation"
    in
        Html.div 
            [ Attributes.class "vote-button-container"
            ]
            [ voteSections isPositive
            , Html.div 
                [ Attributes.class "vote-button-representation"
                , Attributes.class class
                , Attributes.style "clip-path" (getClip isPositive value)
                ]
                [ --icon
                  --  |> Icons.toHtml []
                ]
            , Html.div [ Attributes.class "vote-button-background" ]
                [ --icon
                  --  |> Icons.toHtml []
                ]
            ]

view : Model -> Html Msg
view model = -- todo
    Html.div [ Attributes.class "vote-view" ]
    [ voteButton True model.value
    , Html.text (String.fromFloat model.score)
    , voteButton False model.value
    ]