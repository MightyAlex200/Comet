module SearchView exposing
    ( SearchView
    , handleFunctionReturn
    , init
    , view
    )

import Comet.Port exposing (Id, getNewId)
import Comet.Posts
import Comet.Types.Address exposing (Address)
import Comet.Types.Load as Load exposing (Load(..))
import Comet.Types.Search exposing (Search)
import Comet.Types.SearchResult as SearchResult exposing (SearchResult)
import Comet.Types.ZomeApiError as ZomeApiError exposing (ZomeApiError)
import Comet.Types.ZomeApiResult as ZomeApiResult
import Html exposing (Html)
import Json.Decode as Decode
import PostSummary exposing (PostSummary)


type alias SearchView =
    { searchId : Id
    , results : Load ZomeApiError (List PostSummary)
    }


init : Id -> Search -> Bool -> ( Id, SearchView, Cmd msg )
init oldId query excludeCrossposts =
    let
        searchId =
            getNewId oldId
    in
    ( searchId
    , { searchId = searchId
      , results = Unloaded
      }
    , Comet.Posts.search
        searchId
        query
        excludeCrossposts
    )


handleFunctionReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> SearchView
    -> ( Id, SearchView, Cmd msg )
handleFunctionReturn oldId ret searchView =
    if ret.id == searchView.searchId then
        let
            decoder =
                ZomeApiResult.decode (Decode.list SearchResult.decode)

            decodeResult =
                Decode.decodeValue decoder ret.return
        in
        case decodeResult of
            Ok (Ok searchResults) ->
                let
                    fold result ( prevId, ss, cmds ) =
                        let
                            ( newId, s, cmd ) =
                                PostSummary.init
                                    prevId
                                    result.address
                                    result.inTermsOf
                        in
                        ( newId, s :: ss, cmd :: cmds )

                    ( summariesId, summaries, summariesCmds ) =
                        searchResults
                            |> List.foldr fold ( oldId, [], [] )
                in
                ( summariesId
                , { searchView
                    | results = Loaded summaries
                  }
                , Cmd.batch summariesCmds
                )

            Ok (Err e) ->
                ( oldId
                , { searchView
                    | results =
                        Failed e
                  }
                , Cmd.none
                )

            Err _ ->
                ( oldId
                , { searchView
                    | results =
                        Failed (ZomeApiError.Internal "Invalid return")
                  }
                , Cmd.none
                )

    else
        case searchView.results of
            Loaded results ->
                let
                    fold result ( prevId, rs, cmds ) =
                        let
                            ( id, r, cmd ) =
                                PostSummary.handleFunctionReturn
                                    prevId
                                    ret
                                    result
                        in
                        ( id
                        , r :: rs
                        , cmd :: cmds
                        )

                    ( newId, updatedResults, summariesCmds ) =
                        results
                            |> List.foldr fold ( oldId, [], [] )
                in
                ( newId
                , { searchView | results = Loaded updatedResults }
                , Cmd.batch summariesCmds
                )

            _ ->
                ( oldId, searchView, Cmd.none )


view : SearchView -> Html msg
view searchView =
    case searchView.results of
        Loaded results ->
            results
                |> List.map PostSummary.view
                |> Html.div []

        Failed err ->
            Html.text "Failed to load search results"

        Unloaded ->
            Html.text "Loading search results..."
