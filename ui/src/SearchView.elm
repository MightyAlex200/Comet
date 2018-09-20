module SearchView exposing (..)

import SearchResult exposing (SearchResult)
import Loadable exposing (Loadable)
import KarmaMap exposing (KarmaMap)
import Tags exposing (Tag, Search)
import Json.Encode as Encode
import Json.Decode as Decode
import Links exposing (Link)
import Post exposing (Post)
import Html exposing (Html)
import SearchResult
import PostSummary
import Http

-- Model

type alias Model =
    { posts : List PostSummary.Model
    , search : Search Tag
    , karmaMap : KarmaMap
    }

type Msg
    = NoOp
    | RequestSearch (Search Tag)
    | ReceivePosts (List SearchResult)
    | ReceiveError
    | PostSummaryMsg PostSummary.Model PostSummary.Msg

init : KarmaMap -> Search Tag -> ( Model, Cmd Msg )
init karmaMap search =
    let
        uninitialized =
            Model
                []
                (Tags.Exactly 0)
                karmaMap
    in
        update
            (RequestSearch search)
            uninitialized

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
        RequestSearch search ->
            let
                newModel =
                    { model | search = search }
                process res =
                    case res of
                        Ok searchResults ->
                            ReceivePosts searchResults
                        Err _ ->
                            ReceiveError
                body =
                    (Tags.encode Encode.int search)
                        |> Http.jsonBody
                request =
                    Http.post 
                        "/fn/posts/search"
                        body
                        (Decode.list SearchResult.decoder)
                cmd =
                    Http.send process request
            in
                ( newModel, cmd )
        ReceivePosts posts ->
            let
                postTuples =
                    posts
                        |> List.map (\{ link, inTermsOf } -> 
                                PostSummary.fromHash
                                    model.karmaMap
                                    link.hash
                                    (Just inTermsOf)
                            )
                postSummaries =
                    postTuples
                        |> List.map Tuple.first
                cmd =
                    postTuples
                        |> List.map (\( summary, summaryMsg ) -> 
                                Cmd.map (PostSummaryMsg summary) summaryMsg 
                            )
                        |> Cmd.batch
                newModel =
                    { model | posts = postSummaries }
            in
                ( newModel, cmd )
        ReceiveError ->
            ( model, Cmd.none )
        PostSummaryMsg postSummary postSummaryMsg ->
            let
                processSummary summary tuple =
                    case Tuple.first tuple of
                        Just summaryCmd ->
                            ( Just summaryCmd, summary :: (Tuple.second tuple) )
                        Nothing ->
                            if summary.hash == postSummary.hash then
                                let
                                    updated = PostSummary.update postSummaryMsg summary
                                in
                                    ( Just (Cmd.map (PostSummaryMsg (Tuple.first updated)) (Tuple.second updated))
                                    , (Tuple.first updated) :: (Tuple.second tuple)
                                    )
                            else
                                ( Nothing, summary :: (Tuple.second tuple) )
                ( cmd, updatedPosts ) =
                    List.foldr processSummary ( Nothing, [] ) model.posts
            in
                ( { model | posts = updatedPosts }
                , Maybe.withDefault Cmd.none cmd
                )

-- View

view : Model -> Html Msg
view model = -- TODO
    let
        posts =
            model.posts
                |> List.map (\postSummary ->
                        Html.map
                            (PostSummaryMsg postSummary)
                            (PostSummary.view postSummary)
                    )
    in
        Html.div []
        posts
