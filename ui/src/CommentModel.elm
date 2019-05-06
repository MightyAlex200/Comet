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
    , updateCommentModelInTermsOf
    , updateCommentTreeInTermsOf
    , updateCommentTreeModel
    , viewCommentModel
    , viewCommentTree
    )

import Comet.Comments
import Comet.Port exposing (Id, getNewId)
import Comet.Types.Address exposing (Address)
import Comet.Types.Comment as Comment exposing (Comment)
import Comet.Types.Load exposing (Load(..))
import Comet.Types.SearchResult exposing (InTermsOf)
import Comet.Types.ZomeApiError as ZomeApiError exposing (ZomeApiError)
import Comet.Types.ZomeApiResult as ZomeApiResult
import CommentCompose
    exposing
        ( CommentCompose
        , CommentComposeMsg
        )
import Html exposing (Html)
import Html.Attributes
import Json.Decode as Decode
import KarmaMap exposing (KarmaMap)
import Markdown
import Settings exposing (Settings)
import VoteModel exposing (VoteModel, VoteMsg)


type alias CommentModel =
    { address : Address
    , comment : Load ZomeApiError Comment
    , readId : Id
    , commentCompose : CommentCompose
    , treeModel : CommentTreeModel
    , voteModel : VoteModel
    }


type CommentModelMsg
    = TreeModelMsg CommentTreeMsg
    | ComposeMsg CommentComposeMsg
    | VoteModelMsg VoteMsg


initCommentModel : Id -> Address -> Maybe InTermsOf -> ( Id, CommentModel, Cmd msg )
initCommentModel oldId address inTermsOf =
    let
        newReadId =
            getNewId oldId

        ( newId, commentTreeModel, ctmCmd ) =
            initCommentTreeModel newReadId address

        ( newId2, voteModel, voteCmd ) =
            VoteModel.init newId address inTermsOf

        commentModel =
            { address = address
            , comment = Unloaded
            , readId = newReadId
            , commentCompose = CommentCompose.init address
            , treeModel = commentTreeModel
            , voteModel = voteModel
            }
    in
    ( newId2
    , commentModel
    , Cmd.batch
        [ Comet.Comments.readComment newReadId address
        , ctmCmd
        , voteCmd
        ]
    )


commentsFromAddresses :
    Id
    -> CommentTreeModel
    -> List Address
    -> Maybe InTermsOf
    -> ( Id, CommentTreeModel, Cmd msg )
commentsFromAddresses oldId treeModel addresses inTermsOf =
    let
        treeModelRecord =
            case treeModel of
                CommentTreeModel r ->
                    r

        fold address ( i, cs, cmds ) =
            let
                ( i2, c, cmd ) =
                    initCommentModel i address inTermsOf
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
                    CommentCompose.update
                        oldId
                        composeMsg
                        commentModel.commentCompose
            in
            ( newId
            , { commentModel | commentCompose = composeModel }
            , Cmd.map ComposeMsg cmd
            )

        VoteModelMsg voteMsg ->
            let
                ( newId, voteModel, cmd ) =
                    VoteModel.update
                        oldId
                        voteMsg
                        commentModel.address
                        commentModel.voteModel
            in
            ( newId
            , { commentModel | voteModel = voteModel }
            , Cmd.map VoteModelMsg cmd
            )


updateCommentModelInTermsOf :
    Id
    -> InTermsOf
    -> CommentModel
    -> ( Id, CommentModel, Cmd msg )
updateCommentModelInTermsOf oldId inTermsOf commentModel =
    let
        ( voteModelId, updatedVoteModel, voteModelCmd ) =
            VoteModel.updateInTermsOf
                oldId
                commentModel.address
                inTermsOf
                commentModel.voteModel

        ( treeModelId, updatedTreeModel, treeModelCmd ) =
            updateCommentTreeInTermsOf
                voteModelId
                inTermsOf
                commentModel.treeModel
    in
    ( treeModelId
    , { commentModel
        | treeModel = updatedTreeModel
        , voteModel = updatedVoteModel
      }
    , Cmd.batch
        [ voteModelCmd
        , treeModelCmd
        ]
    )


handleCommentModelFunctionReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> CommentModel
    -> Maybe InTermsOf
    -> ( Id, CommentModel, Cmd msg )
handleCommentModelFunctionReturn oldId ret commentModel inTermsOf =
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

            Err _ ->
                updateComment
                    (Failed (ZomeApiError.Internal "Invalid return"))

    else
        let
            ( newId, newCommentModel, newCmd ) =
                commentModelReturnHelper oldId ret commentModel inTermsOf

            ( voteId, voteModel, voteCmd ) =
                VoteModel.handleFunctionReturn newId ret commentModel.voteModel
        in
        ( voteId
        , { newCommentModel | voteModel = voteModel }
        , Cmd.batch
            [ newCmd
            , voteCmd
            ]
        )


commentModelReturnHelper :
    Id
    -> Comet.Port.FunctionReturn
    -> CommentModel
    -> Maybe InTermsOf
    -> ( Id, CommentModel, Cmd msg )
commentModelReturnHelper oldId ret commentModel inTermsOf =
    let
        ( newId1, treeModel, treeCmd ) =
            handleCommentTreeFunctionReturn
                oldId
                ret
                commentModel.treeModel
                inTermsOf

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


viewCommentModel :
    Maybe InTermsOf
    -> Settings
    -> CommentModel
    -> Html CommentModelMsg
viewCommentModel inTermsOf settings commentModel =
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

        voteHtml =
            case commentModel.comment of
                Loaded comment ->
                    VoteModel.view
                        comment.keyHash
                        settings
                        inTermsOf
                        commentModel.voteModel
                        |> Html.map VoteModelMsg

                _ ->
                    Html.text "Loading votes"
    in
    Html.div
        []
        [ voteHtml
        , commentHtml
        , Html.br [] []
        , CommentCompose.view settings commentModel.commentCompose
            |> Html.map ComposeMsg
        , Html.div
            [ Html.Attributes.style "margin" "32px" ]
            [ viewCommentTree inTermsOf settings commentModel.treeModel
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
    = CommentMsg Address CommentModelMsg


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
                            if subcomment.address == commentModel then
                                let
                                    ( i2, newSubcomment, cmd ) =
                                        updateCommentModel
                                            i
                                            commentMsg
                                            subcomment
                                in
                                ( i2
                                , newSubcomment :: cs
                                , Cmd.map
                                    (CommentMsg newSubcomment.address)
                                    cmd
                                    :: cmds
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


updateCommentTreeInTermsOf :
    Id
    -> InTermsOf
    -> CommentTreeModel
    -> ( Id, CommentTreeModel, Cmd msg )
updateCommentTreeInTermsOf oldId inTermsOf ctm =
    let
        ctmRecord =
            case ctm of
                CommentTreeModel r ->
                    r

        fold comment ( i, cs, cms ) =
            let
                ( i2, c, cm ) =
                    updateCommentModelInTermsOf
                        i
                        inTermsOf
                        comment
            in
            ( i2, c :: cs, cm :: cms )

        ( newId, updatedComments, cmds ) =
            case ctmRecord.subcomments of
                Loaded subcomments ->
                    subcomments
                        |> List.foldr fold ( oldId, [], [] )
                        |> (\( a, b, c ) -> ( a, Loaded b, c ))

                _ ->
                    ( oldId, ctmRecord.subcomments, [] )
    in
    ( newId
    , CommentTreeModel { ctmRecord | subcomments = updatedComments }
    , Cmd.batch cmds
    )


handleCommentTreeFunctionReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> CommentTreeModel
    -> Maybe InTermsOf
    -> ( Id, CommentTreeModel, Cmd msg )
handleCommentTreeFunctionReturn oldId ret treeModel inTermsOf =
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
                commentsFromAddresses oldId treeModel addresses inTermsOf

            Ok (Err apiError) ->
                updateSubcomments (Failed apiError)

            Err _ ->
                updateSubcomments (Failed (ZomeApiError.Internal "Invalid return"))

    else
        case treeModelRecord.subcomments of
            Loaded subcomments ->
                let
                    fold subcomment ( i, cs, cmds ) =
                        let
                            ( i2, c, cmd ) =
                                handleCommentModelFunctionReturn
                                    i
                                    ret
                                    subcomment
                                    inTermsOf
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


viewCommentTree :
    Maybe InTermsOf
    -> Settings
    -> CommentTreeModel
    -> Html CommentTreeMsg
viewCommentTree inTermsOf settings ctm =
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
                        viewCommentModel inTermsOf settings comment
                            |> Html.map (CommentMsg comment.address)
                    )
                |> List.map List.singleton
                |> List.map (Html.li [])
                |> Html.ul []
