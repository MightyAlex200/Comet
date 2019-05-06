module PostModel exposing
    ( PostModel
    , PostMsg(..)
    , handleFunctionReturn
    , init
    , update
    , view
    )

import Comet.Port exposing (Id, getNewId)
import Comet.Posts
import Comet.Types.Address exposing (Address)
import Comet.Types.Load as Load exposing (Load(..))
import Comet.Types.Post as Post exposing (Post)
import Comet.Types.PostTags as PostTags
import Comet.Types.SearchResult exposing (InTermsOf)
import Comet.Types.ZomeApiError as ZomeApiError exposing (ZomeApiError)
import Comet.Types.ZomeApiResult as ZomeApiResult
import CommentCompose
    exposing
        ( CommentCompose
        , CommentComposeMsg
        )
import CommentModel
    exposing
        ( CommentTreeModel
        , CommentTreeMsg
        , handleCommentTreeFunctionReturn
        , initCommentTreeModel
        , updateCommentTreeInTermsOf
        , updateCommentTreeModel
        , viewCommentTree
        )
import Html exposing (Html)
import Json.Decode as Decode
import KarmaMap exposing (KarmaMap)
import Markdown
import NameTag exposing (NameTag)
import Settings exposing (Settings)
import VoteModel exposing (VoteModel, VoteMsg)


type alias PostModel =
    { address : Address
    , post : Load ZomeApiError Post
    , voteModel : VoteModel
    , nameTag : NameTag
    , comments : CommentTreeModel
    , commentCompose : CommentCompose
    , inTermsOf : Load ZomeApiError InTermsOf
    , tagId : Maybe Id
    , readId : Id
    }


type PostMsg
    = TreeModelMsg CommentTreeMsg
    | ComposeMsg CommentComposeMsg
    | VoteModelMsg VoteMsg


init : Id -> Address -> Maybe InTermsOf -> ( Id, PostModel, Cmd msg )
init oldId address inTermsOf =
    let
        newReadId =
            getNewId oldId

        ( newId, ctm, ctmCmd ) =
            initCommentTreeModel newReadId address

        requiredCmds =
            [ Comet.Posts.readPost newReadId address
            , ctmCmd
            , voteModelCmd
            , nameTagCmd
            ]

        ( newId2, voteModel, voteModelCmd ) =
            VoteModel.init newId address inTermsOf

        ( newId3, nameTag, nameTagCmd ) =
            NameTag.init newId2 Nothing

        ( newId4, cmds, tagId ) =
            case inTermsOf of
                Nothing ->
                    let
                        id =
                            getNewId newId
                    in
                    ( id
                    , Comet.Posts.postTags id address :: requiredCmds
                    , Just id
                    )

                Just _ ->
                    ( newId
                    , requiredCmds
                    , Nothing
                    )

        postModel =
            { address = address
            , post = Unloaded
            , comments = ctm
            , commentCompose = CommentCompose.init address
            , inTermsOf = Load.fromMaybe inTermsOf
            , tagId = tagId
            , voteModel = voteModel
            , readId = newReadId
            , nameTag = nameTag
            }
    in
    ( newId4
    , postModel
    , Cmd.batch cmds
    )


update :
    Id
    -> PostMsg
    -> PostModel
    -> ( Id, PostModel, Cmd PostMsg )
update oldId msg postModel =
    case msg of
        TreeModelMsg treeMsg ->
            let
                ( newId, treeModel, cmd ) =
                    updateCommentTreeModel oldId treeMsg postModel.comments
            in
            ( newId
            , { postModel | comments = treeModel }
            , Cmd.map TreeModelMsg cmd
            )

        ComposeMsg composeMsg ->
            let
                ( newId, composeModel, cmd ) =
                    CommentCompose.update
                        oldId
                        composeMsg
                        postModel.commentCompose
            in
            ( newId
            , { postModel | commentCompose = composeModel }
            , Cmd.map ComposeMsg cmd
            )

        VoteModelMsg voteMsg ->
            let
                ( newId, voteModel, cmd ) =
                    VoteModel.update
                        oldId
                        voteMsg
                        postModel.address
                        postModel.voteModel
            in
            ( newId
            , { postModel | voteModel = voteModel }
            , Cmd.map VoteModelMsg cmd
            )


handleFunctionReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> PostModel
    -> ( Id, PostModel, Cmd msg )
handleFunctionReturn oldId ret postModel =
    if ret.id == postModel.readId then
        let
            decoder =
                ZomeApiResult.decode Post.decode

            decodeResult =
                Decode.decodeValue decoder ret.return
        in
        case decodeResult of
            Ok (Ok post) ->
                let
                    ( newId, nameTag, nameCmd ) =
                        postModel.nameTag
                            |> NameTag.updateAgent oldId post.keyHash
                in
                ( newId
                , { postModel
                    | post = Loaded post
                    , nameTag = nameTag
                  }
                , nameCmd
                )

            Ok (Err e) ->
                ( oldId
                , { postModel
                    | post = Failed e
                  }
                , Cmd.none
                )

            Err _ ->
                ( oldId
                , { postModel
                    | post = Failed (ZomeApiError.Internal "Invalid return")
                  }
                , Cmd.none
                )

    else if Just ret.id == postModel.tagId then
        let
            decoder =
                ZomeApiResult.decode PostTags.decode

            decodeResult =
                Decode.decodeValue decoder ret.return
        in
        case decodeResult of
            Ok (Ok inTermsOf) ->
                let
                    ( newId, updatedVoteModel, cmd ) =
                        VoteModel.updateInTermsOf
                            oldId
                            postModel.address
                            inTermsOf.originalTags
                            postModel.voteModel

                    ( ctmId, updatedCommentTree, ctmCmd ) =
                        updateCommentTreeInTermsOf
                            newId
                            inTermsOf.originalTags
                            postModel.comments
                in
                ( ctmId
                , { postModel
                    | inTermsOf = Loaded inTermsOf.originalTags
                    , voteModel = updatedVoteModel
                    , comments = updatedCommentTree
                  }
                , Cmd.batch
                    [ cmd
                    , ctmCmd
                    ]
                )

            Ok (Err apiError) ->
                ( oldId
                , { postModel
                    | inTermsOf = Failed apiError
                  }
                , Cmd.none
                )

            Err _ ->
                ( oldId
                , { postModel
                    | inTermsOf =
                        Failed (ZomeApiError.Internal "Invalid return")
                  }
                , Cmd.none
                )

    else
        let
            ( newId, newModel, treeCmd ) =
                commentTreeReturn oldId ret postModel

            ( voteId, voteModel, voteCmd ) =
                VoteModel.handleFunctionReturn newId ret postModel.voteModel

            ( nameId, nameTag, nameCmd ) =
                NameTag.handleFunctionReturn voteId ret postModel.nameTag
        in
        ( nameId
        , { newModel
            | voteModel = voteModel
            , nameTag = nameTag
          }
        , Cmd.batch
            [ treeCmd
            , voteCmd
            , nameCmd
            ]
        )


commentTreeReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> PostModel
    -> ( Id, PostModel, Cmd msg )
commentTreeReturn oldId ret postModel =
    let
        ( newId1, treeModel, treeCmd ) =
            handleCommentTreeFunctionReturn
                oldId
                ret
                postModel.comments
                (postModel.inTermsOf |> Load.toMaybe)

        composeReturnResult =
            CommentCompose.handleFunctionReturn
                newId1
                ret
                postModel.commentCompose
    in
    if composeReturnResult.refresh then
        let
            ( treeModelId, newTreeModel, newTreeCmd ) =
                initCommentTreeModel
                    composeReturnResult.newId
                    postModel.address
        in
        ( treeModelId
        , { postModel
            | comments = newTreeModel
            , commentCompose = composeReturnResult.commentCompose
          }
        , Cmd.batch
            [ newTreeCmd
            , composeReturnResult.cmd
            ]
        )

    else
        ( composeReturnResult.newId
        , { postModel
            | comments = treeModel
            , commentCompose = composeReturnResult.commentCompose
          }
        , Cmd.batch [ treeCmd, composeReturnResult.cmd ]
        )


view :
    Settings
    -> PostModel
    -> Html PostMsg
view settings postModel =
    let
        inTermsOf =
            postModel.inTermsOf
                |> Load.toMaybe

        nameHtml =
            NameTag.view postModel.nameTag

        postHtml =
            case postModel.post of
                Unloaded ->
                    Html.text "Loading post"

                Failed x ->
                    Html.text
                        ("Failed loading post: " ++ ZomeApiError.describe x)

                Loaded post ->
                    viewPost settings post

        voteHtml =
            case postModel.post of
                Loaded post ->
                    VoteModel.view
                        post.keyHash
                        settings
                        inTermsOf
                        postModel.voteModel
                        |> Html.map VoteModelMsg

                _ ->
                    Html.text "Loading votes"
    in
    Html.div
        []
        [ nameHtml
        , voteHtml
        , postHtml
        , Html.br [] []
        , CommentCompose.view settings postModel.commentCompose
            |> Html.map ComposeMsg
        , viewCommentTree inTermsOf settings postModel.comments
            |> Html.map TreeModelMsg
        ]


viewPost : Settings -> Post -> Html msg
viewPost settings post =
    Html.div []
        [ Html.h1 [] [ Html.text post.title ]
        , Markdown.toHtmlWith
            (Settings.markdownOptions settings.markdownSettings)
            []
            post.content
        ]
