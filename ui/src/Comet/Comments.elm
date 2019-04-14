module Comet.Comments exposing
    ( commentsFromAddress
    , createComment
    , deleteComment
    , readComment
    , updateComment
    )

import Comet.Port exposing (FunctionInformation)
import Comet.Types.Address exposing (Address)
import Comet.Types.CommentContent as CommentContent exposing (CommentContent)
import Json.Encode as Encode


funcInfo : String -> FunctionInformation
funcInfo name =
    { zome = "comments"
    , functionName = name
    }


createComment : Comet.Port.Id -> CommentContent -> Address -> Cmd msg
createComment id comment target =
    Comet.Port.callFunction
        { functionInfo = funcInfo "create_comment"
        , value =
            Encode.object
                [ ( "comment", CommentContent.encode comment )
                , ( "target", Encode.string target )
                ]
        , id = id
        }


readComment : Comet.Port.Id -> Address -> Cmd msg
readComment id address =
    Comet.Port.callFunction
        { functionInfo = funcInfo "read_comment"
        , value =
            Encode.object
                [ ( "address", Encode.string address )
                ]
        , id = id
        }


updateComment : Comet.Port.Id -> Address -> CommentContent -> Cmd msg
updateComment id oldAddress newEntry =
    Comet.Port.callFunction
        { functionInfo = funcInfo "update_comment"
        , value =
            Encode.object
                [ ( "old_address", Encode.string oldAddress )
                , ( "new_entry", CommentContent.encode newEntry )
                ]
        , id = id
        }


deleteComment : Comet.Port.Id -> Address -> Cmd msg
deleteComment id address =
    Comet.Port.callFunction
        { functionInfo = funcInfo "delete_comment"
        , value =
            Encode.object
                [ ( "address", Encode.string address )
                ]
        , id = id
        }


commentsFromAddress : Comet.Port.Id -> Address -> Cmd msg
commentsFromAddress id address =
    Comet.Port.callFunction
        { functionInfo = funcInfo "comments_from_address"
        , value =
            Encode.object
                [ ( "address", Encode.string address )
                ]
        , id = id
        }
