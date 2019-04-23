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
        , updateCommentTreeModel
        , viewCommentTree
        )
import Html exposing (Html)
import Json.Decode as Decode
import KarmaMap exposing (KarmaMap)
import Markdown
import Settings exposing (Settings)
import VoteModel exposing (VoteModel, VoteMsg)


type alias PostModel =
    { address : Address
    , post : Load ZomeApiError Post
    , voteModel : VoteModel
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
            ]

        ( newId2, cmds, tagId ) =
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

        ( newId3, voteModel, voteModelCmd ) =
            VoteModel.init newId2 address inTermsOf

        postModel =
            { address = address
            , post = Unloaded
            , comments = ctm
            , commentCompose = CommentCompose.init address
            , inTermsOf = Load.fromMaybe inTermsOf
            , tagId = tagId
            , voteModel = voteModel
            , readId = newReadId
            }
    in
    ( newId3
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

            updatePost post =
                ( oldId
                , { postModel
                    | post = post
                  }
                , Cmd.none
                )
        in
        case decodeResult of
            Ok apiResult ->
                updatePost (Load.fromResult apiResult)

            Err _ ->
                updatePost (Failed (ZomeApiError.Internal "Invalid return"))

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
                in
                ( newId
                , { postModel
                    | inTermsOf = Loaded inTermsOf.originalTags
                    , voteModel = updatedVoteModel
                  }
                , cmd
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
        in
        ( voteId
        , { newModel | voteModel = voteModel }
        , Cmd.batch
            [ treeCmd
            , voteCmd
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
    KarmaMap
    -> Settings
    -> PostModel
    -> Html PostMsg
view karmaMap settings postModel =
    let
        inTermsOf =
            postModel.inTermsOf
                |> Load.toMaybe

        postHtml =
            case postModel.post of
                Unloaded ->
                    Html.text "Loading post"

                Failed x ->
                    Html.text
                        ("Failed loading post: " ++ ZomeApiError.describe x)

                Loaded post ->
                    viewPost settings post
    in
    Html.div
        []
        [ VoteModel.view karmaMap inTermsOf postModel.voteModel
            |> Html.map VoteModelMsg
        , postHtml
        , Html.br [] []
        , CommentCompose.view settings postModel.commentCompose
            |> Html.map ComposeMsg
        , viewCommentTree karmaMap inTermsOf settings postModel.comments
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
