module CommentModel exposing
    ( CommentModel
    , CommentModelMsg(..)
    , CommentTreeModel(..)
    , CommentTreeMsg(..)
    , handleCommentModelFunctionReturn
    , handleCommentTreeFunctionReturn
    , initCommentModel
    , initCommentTreeModel
    , updateCommentModel
    , updateCommentTreeModel
    , viewCommentModel
    , viewCommentTree
    )

import Comet.Comments
import Comet.Port exposing (Id, getNewId)
import Comet.Types.Address exposing (Address)
import Comet.Types.Comment as Comment exposing (Comment)
import Comet.Types.Load as Load exposing (Load(..))
import Comet.Types.ZomeApiError as ZomeApiError exposing (ZomeApiError)
import Comet.Types.ZomeApiResult as ZomeApiResult
import CommentCompose
    exposing
        ( CommentCompose
        , CommentComposeMsg
        , initCommentCompose
        , updateCommentCompose
        , viewCommentCompose
        )
import Html exposing (Html)
import Html.Attributes
import Json.Decode as Decode
import Markdown
import Settings exposing (Settings)


type alias CommentModel =
    { address : Address
    , comment : Load ZomeApiError Comment
    , readId : Id
    , commentCompose : CommentCompose
    , treeModel : CommentTreeModel
    }


type CommentModelMsg
    = TreeModelMsg CommentTreeMsg
    | ComposeMsg CommentComposeMsg


initCommentModel : Id -> Address -> ( Id, CommentModel, Cmd msg )
initCommentModel oldId address =
    let
        newReadId =
            getNewId oldId

        ( newId, commentTreeModel, ctmCmds ) =
            initCommentTreeModel newReadId address

        commentModel =
            { address = address
            , comment = Unloaded
            , readId = newReadId
            , commentCompose = initCommentCompose address
            , treeModel = commentTreeModel
            }
    in
    ( newId
    , commentModel
    , Cmd.batch
        [ ctmCmds
        , Comet.Comments.readComment newReadId address
        ]
    )


commentsFromAddresses :
    Id
    -> CommentTreeModel
    -> List Address
    -> ( Id, CommentTreeModel, Cmd msg )
commentsFromAddresses oldId treeModel addresses =
    let
        treeModelRecord =
            case treeModel of
                CommentTreeModel r ->
                    r

        fold address ( i, cs, cmds ) =
            let
                ( i2, c, cmd ) =
                    initCommentModel i address
            in
            ( i2, c :: cs, cmd :: cmds )

        ( newId, comments, newCmds ) =
            addresses
                |> List.foldr fold ( oldId, [], [] )
    in
    ( newId
    , CommentTreeModel { treeModelRecord | subcomments = Loaded comments }
    , Cmd.batch newCmds
    )


updateCommentModel :
    Id
    -> CommentModelMsg
    -> CommentModel
    -> ( Id, CommentModel, Cmd CommentModelMsg )
updateCommentModel oldId msg commentModel =
    case msg of
        TreeModelMsg treeMsg ->
            let
                ( newId, treeModel, cmd ) =
                    updateCommentTreeModel oldId treeMsg commentModel.treeModel
            in
            ( newId
            , { commentModel | treeModel = treeModel }
            , Cmd.map TreeModelMsg cmd
            )

        ComposeMsg composeMsg ->
            let
                ( newId, composeModel, cmd ) =
                    updateCommentCompose
                        oldId
                        composeMsg
                        commentModel.commentCompose
            in
            ( newId
            , { commentModel | commentCompose = composeModel }
            , Cmd.map ComposeMsg cmd
            )


handleCommentModelFunctionReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> CommentModel
    -> ( Id, CommentModel, Cmd msg )
handleCommentModelFunctionReturn oldId ret commentModel =
    if ret.id == commentModel.readId then
        let
            decoder =
                ZomeApiResult.decode Comment.decode

            decodeResult =
                Decode.decodeValue decoder ret.return

            updateComment comment =
                ( oldId
                , { commentModel | comment = comment }
                , Cmd.none
                )
        in
        case decodeResult of
            Ok (Ok comment) ->
                updateComment (Loaded comment)

            Ok (Err apiError) ->
                updateComment (Failed apiError)

            Err decodeError ->
                updateComment
                    (Failed (ZomeApiError.Internal "Invalid return"))

    else
        let
            ( newId1, treeModel, treeCmd ) =
                handleCommentTreeFunctionReturn
                    oldId
                    ret
                    commentModel.treeModel

            composeReturnResult =
                CommentCompose.handleFunctionReturn
                    newId1
                    ret
                    commentModel.commentCompose
        in
        if composeReturnResult.refresh then
            let
                ( treeModelId, newTreeModel, newTreeCmd ) =
                    initCommentTreeModel
                        composeReturnResult.newId
                        commentModel.address
            in
            ( treeModelId
            , { commentModel
                | treeModel = newTreeModel
                , commentCompose = composeReturnResult.commentCompose
              }
            , Cmd.batch
                [ newTreeCmd
                , composeReturnResult.cmd
                ]
            )

        else
            ( composeReturnResult.newId
            , { commentModel
                | treeModel = treeModel
                , commentCompose = composeReturnResult.commentCompose
              }
            , Cmd.batch [ treeCmd, composeReturnResult.cmd ]
            )


viewCommentModel : Settings -> CommentModel -> Html CommentModelMsg
viewCommentModel settings commentModel =
    let
        commentHtml =
            case commentModel.comment of
                Loaded comment ->
                    Markdown.toHtmlWith
                        (Settings.markdownOptions settings.markdownSettings)
                        []
                        comment.content

                Unloaded ->
                    Html.text "Loading comment"

                Failed x ->
                    Html.text
                        ("Failed loading comment: " ++ ZomeApiError.describe x)
    in
    Html.div
        []
        [ commentHtml
        , Html.br [] []
        , viewCommentCompose settings commentModel.commentCompose
            |> Html.map ComposeMsg
        , Html.div
            [ Html.Attributes.style "margin" "32px" ]
            [ viewCommentTree settings commentModel.treeModel
                |> Html.map TreeModelMsg
            ]
        ]


type CommentTreeModel
    = CommentTreeModel
        { address : Address
        , subcomments : Load ZomeApiError (List CommentModel)
        , readId : Id
        }


type CommentTreeMsg
    = CommentMsg CommentModel CommentModelMsg


initCommentTreeModel : Id -> Address -> ( Id, CommentTreeModel, Cmd msg )
initCommentTreeModel oldId address =
    let
        newReadId =
            getNewId oldId

        commentTreeModel =
            CommentTreeModel
                { address = address
                , subcomments = Unloaded
                , readId = newReadId
                }
    in
    ( newReadId
    , commentTreeModel
    , Comet.Comments.commentsFromAddress newReadId address
    )


updateCommentTreeModel :
    Id
    -> CommentTreeMsg
    -> CommentTreeModel
    -> ( Id, CommentTreeModel, Cmd CommentTreeMsg )
updateCommentTreeModel oldId msg treeModel =
    case msg of
        CommentMsg commentModel commentMsg ->
            let
                treeModelRecord =
                    case treeModel of
                        CommentTreeModel r ->
                            r
            in
            case treeModelRecord.subcomments of
                Loaded subcomments ->
                    let
                        fold subcomment ( i, cs, cmds ) =
                            if subcomment == commentModel then
                                let
                                    ( i2, newSubcomment, cmd ) =
                                        updateCommentModel
                                            i
                                            commentMsg
                                            subcomment
                                in
                                ( i2
                                , newSubcomment :: cs
                                , Cmd.map (CommentMsg newSubcomment) cmd :: cmds
                                )

                            else
                                ( i, subcomment :: cs, cmds )

                        ( newId, newSubcomments, newCmds ) =
                            subcomments
                                |> List.foldr fold ( oldId, [], [] )
                    in
                    ( newId
                    , CommentTreeModel
                        { treeModelRecord
                            | subcomments = Loaded newSubcomments
                        }
                    , Cmd.batch newCmds
                    )

                _ ->
                    ( oldId, treeModel, Cmd.none )


handleCommentTreeFunctionReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> CommentTreeModel
    -> ( Id, CommentTreeModel, Cmd msg )
handleCommentTreeFunctionReturn oldId ret treeModel =
    let
        treeModelRecord =
            case treeModel of
                CommentTreeModel r ->
                    r
    in
    if ret.id == treeModelRecord.readId then
        let
            decoder =
                ZomeApiResult.decode (Decode.list Decode.string)

            decodeResult =
                Decode.decodeValue decoder ret.return

            updateSubcomments subcomments =
                ( oldId
                , CommentTreeModel { treeModelRecord | subcomments = subcomments }
                , Cmd.none
                )
        in
        case decodeResult of
            Ok (Ok addresses) ->
                commentsFromAddresses oldId treeModel addresses

            Ok (Err apiError) ->
                updateSubcomments (Failed apiError)

            Err decodeError ->
                updateSubcomments (Failed (ZomeApiError.Internal "Invalid return"))

    else
        case treeModelRecord.subcomments of
            Loaded subcomments ->
                let
                    fold subcomment ( i, cs, cmds ) =
                        let
                            ( i2, c, cmd ) =
                                handleCommentModelFunctionReturn i ret subcomment
                        in
                        ( i2, c :: cs, cmd :: cmds )

                    ( newId, newSubcomments, newCmds ) =
                        subcomments
                            |> List.foldr fold ( oldId, [], [] )
                in
                ( newId
                , CommentTreeModel
                    { treeModelRecord
                        | subcomments = Loaded newSubcomments
                    }
                , Cmd.batch newCmds
                )

            _ ->
                ( oldId, treeModel, Cmd.none )


viewCommentTree : Settings -> CommentTreeModel -> Html CommentTreeMsg
viewCommentTree settings ctm =
    let
        ctmRecord =
            case ctm of
                CommentTreeModel r ->
                    r
    in
    case ctmRecord.subcomments of
        Unloaded ->
            Html.text "Loading subcomments"

        Failed x ->
            Html.text
                ("Failed loading comments: " ++ ZomeApiError.describe x)

        Loaded comments ->
            comments
                |> List.map
                    (\comment ->
                        viewCommentModel settings comment
                            |> Html.map (CommentMsg comment)
                    )
                |> List.map List.singleton
                |> List.map (Html.li [])
                |> Html.ul []
