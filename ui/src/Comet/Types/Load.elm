module Comet.Types.Load exposing
    ( Load(..)
    , fromMaybe
    , fromResult
    , map
    , toMaybe
    )


type Load x a
    = Unloaded
    | Failed x
    | Loaded a


fromMaybe : Maybe a -> Load x a
fromMaybe maybe =
    case maybe of
        Just a ->
            Loaded a

        Nothing ->
            Unloaded


toMaybe : Load x a -> Maybe a
toMaybe load =
    case load of
        Loaded a ->
            Just a

        Failed _ ->
            Nothing

        Unloaded ->
            Nothing


fromResult : Result x a -> Load x a
fromResult result =
    case result of
        Ok a ->
            Loaded a

        Err x ->
            Failed x


map : (a -> b) -> Load x a -> Load x b
map f load =
    case load of
        Unloaded ->
            Unloaded

        Failed x ->
            Failed x

        Loaded a ->
            Loaded (f a)
