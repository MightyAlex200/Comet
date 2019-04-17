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
import Markdown
import Settings exposing (Settings)
import Task exposing (Task)
import Time


type alias CommentCompose =
    { address : Address
    , input : String
    , id : Maybe Id
    , hidden : Bool
    }


type CommentComposeMsg
    = UpdateInput String
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


type alias HandleReturnResult msg =
    { newId : Id
    , commentCompose : CommentCompose
    , cmd : Cmd msg
    , refresh : Bool
    }


handleFunctionReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> CommentCompose
    -> HandleReturnResult msg
handleFunctionReturn oldId ret commentCompose =
    if Just ret.id == commentCompose.id then
        { newId = oldId
        , commentCompose = { commentCompose | hidden = True }
        , cmd = Cmd.none
        , refresh = True
        }

    else
        { newId = oldId
        , commentCompose = commentCompose
        , cmd = Cmd.none
        , refresh = False
        }


updateCommentCompose :
    Id
    -> CommentComposeMsg
    -> CommentCompose
    -> ( Id, CommentCompose, Cmd CommentComposeMsg )
updateCommentCompose oldId msg commentCompose =
    case msg of
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


viewCommentCompose : Settings -> CommentCompose -> Html CommentComposeMsg
viewCommentCompose settings compose =
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
            , Markdown.toHtmlWith
                (Settings.markdownOptions settings.markdownSettings)
                []
                compose.input
            , Html.br [] []
            , Html.button
                [ Html.Events.onClick SubmitNow ]
                [ Html.text "Submit" ]
            , Html.button
                [ Html.Events.onClick (SetHidden True) ]
                [ Html.text "Cancel" ]
            ]
