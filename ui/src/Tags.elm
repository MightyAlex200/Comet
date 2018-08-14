module Tags exposing (..)

type alias Tag =
    Int

type Binary a
    = Exactly a
    | Not (Binary a)
    | And (Binary a) (Binary a)
    | Or (Binary a) (Binary a)
    | Xor (Binary a) (Binary a)
