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
import Json.Decode as Decode
import Set


type alias VoteModel =
    { myVote : Load ZomeApiError (Maybe Vote)
    , allVotes : Load ZomeApiError (List Vote)
    , myVoteId : Maybe Id
    , allVotesId : Maybe Id
    }


type VoteMsg
    = NoOp


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
              }
            , Cmd.none
            )


update :
    Id
    -> VoteMsg
    -> VoteModel
    -> ( Id, VoteModel, Cmd VoteMsg )
update oldId msg voteModel =
    case msg of
        NoOp ->
            ( oldId, voteModel, Cmd.none )


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


view : VoteModel -> Html VoteMsg
view voteModel =
    -- TODO
    Html.text (Debug.toString voteModel)
