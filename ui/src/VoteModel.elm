module VoteModel exposing
    ( VoteModel
    , VoteMsg(..)
    , handleFunctionReturn
    , init
    , update
    , updateInTermsOf
    , view
    )

import Comet.Port exposing (Id, getNewId)
import Comet.Types.Address exposing (Address)
import Comet.Types.Load exposing (Load(..))
import Comet.Types.Option as Option
import Comet.Types.SearchResult exposing (InTermsOf)
import Comet.Types.Tag exposing (Tag)
import Comet.Types.Vote as Vote exposing (Vote)
import Comet.Types.ZomeApiError as ZomeApiError exposing (ZomeApiError)
import Comet.Types.ZomeApiResult as ZomeApiResult
import Comet.Votes
import Html exposing (Html)
import Html.Events as Events
import Json.Decode as Decode
import KarmaMap exposing (KarmaMap, score)
import Set
import Task
import Time


type alias VoteModel =
    { myVote : Load ZomeApiError (Maybe Vote)
    , allVotes : Load ZomeApiError (List Vote)
    , myVoteId : Maybe Id
    , allVotesId : Maybe Id
    , voteId : Maybe Id
    }


type VoteMsg
    = VoteRequest Float InTermsOf
    | VoteNow Float InTermsOf Int


init : Id -> Address -> Maybe InTermsOf -> ( Id, VoteModel, Cmd msg )
init oldId address inTermsOf =
    case inTermsOf of
        Just tags ->
            let
                myVoteId =
                    getNewId oldId

                allVotesId =
                    getNewId myVoteId
            in
            ( allVotesId
            , { myVote = Unloaded
              , allVotes = Unloaded
              , myVoteId = Just myVoteId
              , allVotesId = Just allVotesId
              , voteId = Nothing
              }
            , Cmd.batch
                [ Comet.Votes.getMyVote myVoteId address (Set.toList tags)
                , Comet.Votes.votesFromAddress allVotesId address
                ]
            )

        Nothing ->
            ( oldId
            , { myVote = Unloaded
              , allVotes = Unloaded
              , myVoteId = Nothing
              , allVotesId = Nothing
              , voteId = Nothing
              }
            , Cmd.none
            )


update :
    Id
    -> VoteMsg
    -> Address
    -> VoteModel
    -> ( Id, VoteModel, Cmd VoteMsg )
update oldId msg address voteModel =
    case msg of
        -- TODO: Update KarmaMap
        VoteRequest fraction ito ->
            ( oldId
            , voteModel
            , Time.now
                -- TODO: Helper function for unix time task?
                |> Task.map (\posix -> Time.posixToMillis posix // 1000)
                |> Task.perform (VoteNow fraction ito)
            )

        VoteNow fraction ito time ->
            let
                voteId =
                    getNewId oldId

                itoList =
                    ito
                        |> Set.toList
            in
            ( voteId
            , { voteModel | voteId = Just voteId }
            , Comet.Votes.vote voteId time fraction itoList address
            )


updateInTermsOf :
    Id
    -> Address
    -> InTermsOf
    -> VoteModel
    -> ( Id, VoteModel, Cmd msg )
updateInTermsOf oldId address inTermsOf voteModel =
    let
        myVoteId =
            getNewId oldId

        allVotesId =
            getNewId myVoteId
    in
    ( allVotesId
    , { voteModel
        | myVoteId = Just myVoteId
        , allVotesId = Just allVotesId
      }
    , Cmd.batch
        [ Comet.Votes.getMyVote myVoteId address (Set.toList inTermsOf)
        , Comet.Votes.votesFromAddress allVotesId address
        ]
    )


handleFunctionReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> VoteModel
    -> ( Id, VoteModel, Cmd msg )
handleFunctionReturn oldId ret voteModel =
    if Just ret.id == voteModel.myVoteId then
        let
            decoder =
                ZomeApiResult.decode (Option.decode Vote.decode)

            decodeResult =
                Decode.decodeValue decoder ret.return

            updateMyVote myVote =
                ( oldId
                , { voteModel | myVote = myVote }
                , Cmd.none
                )
        in
        case decodeResult of
            Ok (Ok vote) ->
                updateMyVote (Loaded vote)

            Ok (Err apiError) ->
                updateMyVote (Failed apiError)

            Err _ ->
                updateMyVote (Failed (ZomeApiError.Internal "Invalid return"))

    else if Just ret.id == voteModel.allVotesId then
        let
            decoder =
                ZomeApiResult.decode (Decode.list Vote.decode)

            decodeResult =
                Decode.decodeValue decoder ret.return

            updateAllVotes allVotes =
                ( oldId
                , { voteModel | allVotes = allVotes }
                , Cmd.none
                )
        in
        case decodeResult of
            Ok (Ok votes) ->
                updateAllVotes (Loaded votes)

            Ok (Err apiError) ->
                updateAllVotes (Failed apiError)

            Err _ ->
                updateAllVotes (Failed (ZomeApiError.Internal "Invalid return"))

    else
        ( oldId, voteModel, Cmd.none )


view : KarmaMap -> Maybe InTermsOf -> VoteModel -> Html VoteMsg
view karmaMap inTermsOf voteModel =
    -- TODO
    case ( inTermsOf, voteModel.allVotes ) of
        ( Just ito, Loaded votes ) ->
            Html.div
                []
                [ String.fromFloat
                    (karmaMap |> score votes ito)
                    |> Html.text
                , Html.button
                    [ Events.onClick (VoteRequest 1.0 ito) ]
                    [ Html.text "+" ]
                , Html.button
                    [ Events.onClick (VoteRequest -1.0 ito) ]
                    [ Html.text "-" ]
                ]

        ( _, Loaded _ ) ->
            Html.text "Loading Score"

        ( _, Unloaded ) ->
            Html.text "Loading Score"

        ( _, Failed err ) ->
            Html.text ("Error " ++ Debug.toString err)
