module PostSummary exposing (..)

import Html.Attributes as Attributes
import Loadable exposing (Loadable)
import Post exposing (Post)
import VoteView exposing (Model)
import KarmaMap exposing (KarmaMap)
import Tags exposing (Tag)
import Html exposing (Html)
import Json.Encode as Encode
import Http

-- Model

type alias Model =
    { post : Loadable Post
    , voteView : VoteView.Model
    , karmaMap : KarmaMap
    , inTermsOf : Maybe (List Tag)
    , hash : String
    }

type Msg
    = RequestPost String
    | ReceivePost Post
    | ReceiveError
    | VoteViewMsg VoteView.Msg
    | NoOp

fromHash : KarmaMap -> String -> Maybe (List Tag) -> ( Model, Cmd Msg )
fromHash karmaMap hash inTermsOf =
    let
        ( voteViewModel, voteViewCmd ) =
            VoteView.fromHash karmaMap hash inTermsOf
        uninitialized =
            Model
                Loadable.Unloaded
                voteViewModel
                karmaMap
                inTermsOf
                hash
    in
        update (RequestPost hash) uninitialized

-- Update

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        RequestPost hash ->
            let
                process res =
                    case res of
                        Ok post ->
                            ReceivePost post
                        Err _ ->
                            ReceiveError
                body =
                    Http.jsonBody (Encode.string hash)
                request =
                    Http.post "/fn/posts/postRead" body Post.decoder
                cmds =
                    Http.send process request
            in
                ( { model | hash = hash }, cmds )
        ReceivePost post ->
            let
                newModel =
                    { model
                    | post = Loadable.Loaded post
                    }
            in
                ( newModel, Cmd.none )
        ReceiveError ->
            ( model, Cmd.none )
        VoteViewMsg voteViewMsg ->
            let
                ( updatedVoteView, voteCmd ) =
                    VoteView.update voteViewMsg model.voteView
                cmd =
                    voteCmd
                        |> Cmd.map VoteViewMsg
            in
                ( { model | voteView = updatedVoteView }, cmd)
        NoOp ->
            ( model, Cmd.none )

-- View

view : Model -> Html Msg
view model = -- TODO
    let
        query =
            case model.inTermsOf of
                Just list ->
                    let
                        listStr =
                            list
                                |> Encode.list Encode.int
                                |> Encode.encode 0
                    in
                        "?inTermsOf=" ++ listStr
                Nothing ->
                    ""
        postLink =
            "/post/" ++ model.hash ++ query
        postTitle =
            case model.post of
                Loadable.Loaded post ->
                    post.title
                Loadable.Unloaded ->
                    model.hash
    in
        Html.div
            [ Attributes.class "post-summary" ]
            [ Html.map VoteViewMsg (VoteView.view model.voteView)
            , Html.a [ Attributes.href postLink ] [ Html.text postTitle ]
            ]
