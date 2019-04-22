module Comet.Votes exposing (getMyVote, vote, votesFromAddress)

import Comet.Port exposing (FunctionInformation, Id, callFunction)
import Comet.Types.Address exposing (Address)
import Comet.Types.Tag exposing (Tag)
import Json.Encode as Encode


zomeInfo : String -> FunctionInformation
zomeInfo name =
    { zome = "votes"
    , functionName = name
    }


vote : Id -> Int -> Float -> List Tag -> Address -> Cmd msg
vote id utcUnixTime fraction inTermsOf target =
    callFunction
        { functionInfo = zomeInfo "vote"
        , value =
            Encode.object
                [ ( "utc_unix_time", Encode.int utcUnixTime )
                , ( "fraction", Encode.float fraction )
                , ( "in_terms_of", Encode.list Encode.int inTermsOf )
                , ( "target", Encode.string target )
                ]
        , id = id
        }


getMyVote : Id -> Address -> List Tag -> Cmd msg
getMyVote id address inTermsOf =
    callFunction
        { functionInfo = zomeInfo "get_my_vote"
        , value =
            Encode.object
                [ ( "address", Encode.string address )
                , ( "in_terms_of", Encode.list Encode.int inTermsOf )
                ]
        , id = id
        }


votesFromAddress : Id -> Address -> Cmd msg
votesFromAddress id address =
    callFunction
        { functionInfo = zomeInfo "votes_from_address"
        , value =
            Encode.object
                [ ( "address", Encode.string address )
                ]
        , id = id
        }
