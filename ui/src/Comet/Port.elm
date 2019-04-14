port module Comet.Port exposing
    ( FunctionInformation
    , FunctionParameters
    , FunctionReturn
    , Id
    , callFunction
    , functionReturned
    , getNewId
    )

import Dict exposing (Dict)
import Json.Encode as Encode
import Task


type alias Id =
    Int


getNewId : Id -> Id
getNewId id =
    id + 1


type alias FunctionInformation =
    { zome : String
    , functionName : String
    }


type alias FunctionParameters =
    { functionInfo : FunctionInformation
    , value : Encode.Value
    , id : Id
    }


type alias FunctionReturn =
    { functionInfo : FunctionInformation
    , return : Encode.Value
    , id : Id
    }


port callFunction : FunctionParameters -> Cmd msg


port functionReturned : (FunctionReturn -> msg) -> Sub msg
