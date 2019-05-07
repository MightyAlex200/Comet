module SearchView exposing
    ( SearchView
    , handleFunctionReturn
    , init
    , view
    , viewResult
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


type alias SearchView =
    { searchId : Id

    -- TODO
    , results : Load ZomeApiError (List SearchResult)
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
            Ok apiResult ->
                ( oldId
                , { searchView | results = Load.fromResult apiResult }
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
        ( oldId, searchView, Cmd.none )


view : SearchView -> Html msg
view searchView =
    case searchView.results of
        Loaded results ->
            results
                |> List.map viewResult
                |> Html.div []

        Failed err ->
            Html.text "Failed to load search results"

        Unloaded ->
            Html.text "Loading search results..."


viewResult : SearchResult -> Html msg
viewResult result =
    Html.text (Debug.toString result)
