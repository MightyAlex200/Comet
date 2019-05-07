module UnixTime exposing (currentUtcUnixTime)

import Task exposing (Task)
import Time


currentUtcUnixTime : Task x Int
currentUtcUnixTime =
    Time.now
        |> Task.map (\posix -> Time.posixToMillis posix // 1000)
