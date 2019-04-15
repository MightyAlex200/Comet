module CommentCompose exposing
    ( CommentCompose
    , CommentComposeMsg(..)
    , commentContent
    , handleFunctionReturn
    , initCommentCompose
    , updateCommentCompose
    , viewCommentCompose
    )

import Comet.Comments
import Comet.Port exposing (Id, getNewId)
import Comet.Types.Address exposing (Address)
import Comet.Types.CommentContent exposing (CommentContent)
import Html exposing (Html)
import Html.Events
import Task exposing (Task)
import Time


type alias CommentCompose =
    { address : Address
    , input : String
    , id : Maybe Id
    , hidden : Bool
    }


type CommentComposeMsg
    = FunctionReturn Comet.Port.FunctionReturn
    | UpdateInput String
    | SetHidden Bool
    | SubmitNow
    | Submit CommentContent


initCommentCompose : Address -> CommentCompose
initCommentCompose address =
    { address = address
    , input = ""
    , id = Nothing
    , hidden = True
    }


commentContent : CommentCompose -> Task x CommentContent
commentContent compose =
    Time.now
        |> Task.map (\posix -> Time.posixToMillis posix // 1000)
        |> Task.map (\seconds -> CommentContent compose.input seconds)


handleFunctionReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> CommentCompose
    -> ( Id, CommentCompose, Cmd msg )
handleFunctionReturn oldId ret commentCompose =
    if Just ret.id == commentCompose.id then
        ( oldId, { commentCompose | hidden = True }, Cmd.none )

    else
        ( oldId, commentCompose, Cmd.none )


updateCommentCompose :
    Id
    -> CommentComposeMsg
    -> CommentCompose
    -> ( Id, CommentCompose, Cmd CommentComposeMsg )
updateCommentCompose oldId msg commentCompose =
    case msg of
        FunctionReturn ret ->
            handleFunctionReturn oldId ret commentCompose

        UpdateInput input ->
            ( oldId, { commentCompose | input = input }, Cmd.none )

        SetHidden hidden ->
            ( oldId, { commentCompose | hidden = hidden }, Cmd.none )

        SubmitNow ->
            ( oldId
            , commentCompose
            , commentContent commentCompose
                |> Task.perform Submit
            )

        Submit content ->
            let
                newId =
                    getNewId oldId
            in
            ( newId
            , { commentCompose | id = Just newId }
            , Comet.Comments.createComment newId content commentCompose.address
            )


viewCommentCompose : CommentCompose -> Html CommentComposeMsg
viewCommentCompose compose =
    if compose.hidden then
        Html.button
            [ Html.Events.onClick (SetHidden False) ]
            [ Html.text "Reply" ]

    else
        Html.div
            []
            [ Html.textarea
                [ Html.Events.onInput UpdateInput ]
                []
            , Html.button
                [ Html.Events.onClick SubmitNow ]
                [ Html.text "Submit" ]
            , Html.button
                [ Html.Events.onClick (SetHidden True) ]
                [ Html.text "Cancel" ]
            ]
