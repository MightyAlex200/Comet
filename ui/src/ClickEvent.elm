module ClickEvent exposing (..)

import Json.Decode.Pipeline exposing (decode, optional)
import Json.Decode as Decode exposing (Decoder)

-- Unsupported types commented out
-- https://developer.mozilla.org/en-US/docs/Web/Events/click
type alias ClickEvent =
    { eventType : String
    -- , target : EventTarget
    , bubbles : Bool
    , cancelable : Bool
    -- , view : WindowProxy
    , detail : Int
    -- , currentTarget : EventTarget
    -- , relatedTarget : EventTarget
    , screenX : Float
    , screenY : Float
    , clientX : Float
    , clientY : Float
    , button : Int
    , buttons : Int
    , mozPressure : Float
    , ctrlKey : Bool
    , shiftKey : Bool
    , altKey : Bool
    , metaKey : Bool
    }

decoder : Decoder ClickEvent
decoder =
    decode ClickEvent -- Everything optional for compatibility
        |> optional "eventType" Decode.string "click"
        |> optional "bubbles" Decode.bool False
        |> optional "cancelable" Decode.bool False
        |> optional "detail" Decode.int 0
        |> optional "screenX" Decode.float 0
        |> optional "screenY" Decode.float 0
        |> optional "clientX" Decode.float 0
        |> optional "clientY" Decode.float 0
        |> optional "button" Decode.int 0
        |> optional "buttons" Decode.int 0
        |> optional "mozPressure" Decode.float 0
        |> optional "ctrlKey" Decode.bool False
        |> optional "shiftKey" Decode.bool False
        |> optional "altKey" Decode.bool False
        |> optional "metaKey" Decode.bool False
