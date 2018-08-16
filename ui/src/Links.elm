module Links exposing (..)

import Json.Decode as Decode exposing (Decoder, field, string, value)

type alias Link a =
    { entry : a
    , entryType : String
    , hash : String
    , source : String
    }

type alias Links a =
    List (Link a)

linkDecoder : Decoder a -> Decoder (Link a)
linkDecoder decode =
    Decode.map4 Link
        (field "Entry" decode)
        (field "EntryType" string)
        (field "Hash" string)
        (field "Source" string)

decoder : Decoder a -> Decoder (Links a)
decoder decode =
    Decode.list (linkDecoder decode)
