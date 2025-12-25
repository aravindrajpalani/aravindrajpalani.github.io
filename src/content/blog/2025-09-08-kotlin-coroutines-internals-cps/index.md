---
title: 'Kotlin Coroutines Internals: How CPS and State Machines Power suspend Functions'
meta_title: 'How Kotlin Transforms suspend Functions Using CPS and State Machines'
seoTitle: 'Kotlin Coroutines Internals'
slug: 'kotlin-coroutines-internals'
description: 'Deep dive into how Kotlin compiles suspend functions using CPS and state machines'
pubDate: '2025-09-08T10:31:00Z'
tags: ["kotlin-coroutines", "cps", "state-machine"]
coverImage: './kotlin-coroutines-internals.png'
---


As Android developers, we’ve all worked with different ways of handling asynchronous tasks, whether it’s through callbacks, AsyncTask, RxJava, Coroutines or any other way. Among different ways of handling asynchronous operations, Kotlin Coroutines stand out because they let us write asynchronous code in a natural, sequential style using suspending functions.
For example, let’s say for fetching a user profile data from network, and updating the user profile, the Kotlin coroutines code looks like below.

```kotlin
suspend fun fetchAndUpdateUserProfile(
        userId: Int,
        newName: String,
        newBio: String,
        newAvatarUrl: String
    ) {
        val profile = getUserProfile(userId)
        val updatedProfile = updateUserProfile(profile, newName, newBio, newAvatarUrl)
        println("Updated User Profile: $updatedProfile")
    }
```

Behind this direct, sequential style syntax lies one of the most sophisticated compiler transformations. Yes, compiler transforms above Kotlin coroutine suspend function into complex Continuation Passing Style with state machines.

### Understanding Continuation-Passing Style (CPS)

Before diving into how Kotlin compiler does it, let's understand the concept. In Continuation-Passing Style (CPS), a **function doesn’t return a value** directly. Instead, it **passes its result to a continuation**, which is a function that represents the next step to be taken after the current function finishes executing.

###### Implement Continuation-Passing Style (CPS) with Basic Callbacks

Create **UserProfile data class** to hold information about a user.

```kotlin
data class UserProfile(
    var userId: Int = 0,
    var name: String = "",
    var bio: String = "",
    var avatarUrl: String = ""
)
```

In this part, we simulate fetching and updating a user profile using the Continuation-Passing Style (CPS), where **results are passed to a continuation function** instead of returning them directly.

```kotlin
class UpdateProfileCPS {
    fun getUserProfile(userId: Int, cont: (UserProfile) -> Unit) {
        // Simulate fetching user profile from a database or API
        val fetchedProfile =
            UserProfile(
                userId,
                "John Doe",
                "Android App Developer",
                "https://example.com/avatar.jpg"
            )
        cont(fetchedProfile)
    }

    fun updateUserProfile(
        userProfile: UserProfile,
        newBio: String,
        cont: (UserProfile) -> Unit
    ) {
        // Simulate updating user profile
        userProfile.bio = newBio
        cont(userProfile)
    }

    // Simulate user profile workflow using continuation-passing style
    fun getAndUpdateUserProfile(
        userId: Int,
        newBio: String
    ) {
        getUserProfile(userId) { userProfile ->
            updateUserProfile(userProfile, newBio) { updatedProfile ->
                // Final result after the profile update
                println("Updated Profile Data: $updatedProfile")
            }
        }
    }
}
```

###### Usage

In the main function, we instantiate the UpdateProfileCPS class and invoke the method to simulate user profile update workflow using continuation-passing style.

```kotlin
fun main(args: Array<String>) {
    val updateProfileCPS = UpdateProfileCPS()
    // Assuming we're updating the profile for a user with userId 123
    updateProfileCPS.getAndUpdateUserProfile(
        userId = 123,
        newBio = "Full Stack Developer"
    )
}
```

Though this style works, it’s not how the compiler transforms coroutine code. Rather **Compiler uses Continuation-Passing Style (CPS) with state machine.**

##### Two main reasons why compilers use state machines instead of basic CPS with callbacks.

- **With state machines** everytime we suspend and resume the **objects are reused** . But if we use basic CPS which uses simple callbacks , we have to create new objects for each suspend functions. This efficiency is the reason why most compilers that support asynchronous programming uses state machines for internal compiler transformation.
- Another reason is with state machines , it is **easy to support complex structures like loops** using labeled suspension points.

### How the compiler transforms suspend functions

- **Remove the suspend Keyword :** The compiler first removes all suspend keywords from your function signatures, as they're no longer needed in the transformed version.
- **Add Continuation Parameter :** Each suspend function gets an additional Continuation parameter. This parameter represents "what to do next" after the function completes.
- **Identify Suspension Points :** The compiler analyzes your code and identifies every location where a suspend function is called. These are the points where execution can pause and resume later.
- **Assign Unique Labels :** Each suspension point gets a unique identifier using a label variable (0, 1, 2, etc.). These labels act as a program counter, tracking which step in the execution we're currently at.
- **Generate State Machine with Switch/When :** The compiler creates a big switch statement (or when expression in Kotlin) where each suspension point becomes a separate case. This transforms your linear code into a resumable state machine.
- **Implement Resume Mechanism :** Once a particular suspension point (async function) completes execution, the resume() function in the continuation is called. This resume function calls the generated state machine function again.
- **Label-Based Execution :** When the function is called again via resume(), the state machine uses the label variable to determine our current position in program execution and jumps to the next appropriate switch case to continue from where it left off.

This transformation enables the "magic" of coroutines - functions that can pause mid-execution and resume later on potentially different threads, all while maintaining their local state and providing the illusion of sequential execution.

### Implementation of CPS with State Machine

> **_Important Note: Educational Simplification_**
> Example below is simplified model that demonstrates the core concepts like state machines, continuations, and label-based dispatch behind Kotlin's coroutine compiler transformation. The actual bytecode generated is more complex and includes CoroutineContext object, additional optimizations, exception handling, and integration with the coroutine framework.

###### Continuation interface

First, we need a way to represent "what happens next" after each suspension:
Create Continuation interface that contains resume() function, label, userProfile, userId, newBio variables to save state across suspension points.

```kotlin
interface Continuation {
    var label: Int
    var userProfile: UserProfile
    var userId: Int
    var newBio: String
    fun resume()
}
```

###### Create UpdateProfileCPSStateMachine class

Inside class UpdateProfileCPSStateMachine, create function **getUserProfile()** with continuation parameter. Simulate fetching user data from network . And **once completed call resume() function** in continuation object.
Similarly create function **updateUserProfile()** with continuation parameter. Simulate updating user profile and once completed call resume() function with continuation object.

###### Core part of CPS style with state machine

Create function **getAndUpdateUserProfile()** with continuation parameter . Create a **variable stateMachine** of type Continuation.

Check if passed continuation parameter (continuation) is null. If it is not null assign this continuation parameter to stateMachine variable.

If continuation parameter is null create a new anonymous object implementing the Continuation interface.

Initially label variable will be assigned to 0. Assign values for userId and newBio which will be used by different suspension parts of our program through. Inside resume(), the function getAndUpdateUserProfile() is called with userId, newBio, and this (the current Continuation object itself).

###### class UpdateProfileCPSStateMachine

Define a class named **UpdateProfileCPSStateMachine** to manage user profile operations using a continuation-passing style (CPS) approach with a state machine.

###### fun getUserProfile()

Inside the UpdateProfileCPSStateMachine class, create a function named getUserProfile() that takes a continuation parameter.
Once the simulated fetch is completed, call the **resume()** function on the passed continuation object.

###### fun updateUserProfile()

Similarly, define the function updateUserProfile() with a continuation parameter. After completion, call the **resume()** function on the passed continuation object.

###### fun getAndUpdateUserProfile()

Create a function getAndUpdateUserProfile() with a continuation parameter.  
Define a variable **stateMachine** of type Continuation.  
Check if the passed continuation parameter is null:

- If **not null**, assign it to the stateMachine variable.
- If **null**, create a new anonymous object that implements the Continuation interface.

Initially set label variable to 0, Define variables like **userId** and **newBio** to be used across different suspension points of the function.  
Inside the **resume()** method of the anonymous Continuation interface, call getAndUpdateUserProfile() again with userId, newBio, and the current continuation object (this).

###### when() statement

Create when() statement with stateMachine.label. At start, branch 0 will be executed. On each branch change the stateMachine object's label to next execution point .

```kotlin
stateMachine.label = 1
```

Then call getUserProfile() function by passing stateMachine object as continuation parameter. Once getUserProfile() is completed resume() function is called , which again triggers getAndUpdateUserProfile().  
This time updateUserProfile() function inside branch 2 is executed and so on till the updated profile data is printed in branch 2.

```kotlin
class UpdateProfileCPSStateMachine {

    fun getUserProfile(userId: Int, cont: Continuation) {
        // Simulate fetching user profile from a database or API
        val fetchedProfile = UserProfile(
            userId, "John Doe", "Android App Developer", "https://example.com/avatar.jpg"
        )
        cont.userProfile = fetchedProfile
        cont.resume() // Must continue
    }

    fun updateUserProfile(
        userProfile: UserProfile, newBio: String, cont: Continuation
    ) {
        // Simulate updating the user profile
        userProfile.bio = newBio
        cont.userProfile = userProfile
        cont.resume() // Must continue
    }

    // Simulate user profile workflow using continuation-passing style
    fun getAndUpdateUserProfile(
        userId: Int, newBio: String, continuation: Continuation?
    ) {
        var stateMachine: Continuation? = null
        if (continuation != null) {
            stateMachine = continuation
        } else {
            stateMachine = object : Continuation {
                override var label: Int = 0
                override var userProfile: UserProfile = UserProfile()
                override var userId: Int = userId
                override var newBio: String = newBio
                override fun resume() {
                    getAndUpdateUserProfile(userId, newBio, this)
                }
            }
        }
        when (stateMachine.label) {
            0 -> {
                stateMachine.label = 1
                getUserProfile(stateMachine.userId, stateMachine)
            }

            1 -> {
                stateMachine.label = 2
                updateUserProfile(
                    stateMachine.userProfile, stateMachine.newBio, stateMachine
                )
            }

            2 -> println("Updated Profile Data: ${stateMachine.userProfile}")
        }
    }
}
```

###### Usage

```kotlin
fun main(args: Array<String>) {
    val updateProfileCPSStateMachine = UpdateProfileCPSStateMachine()
    // Assuming we're updating the profile for a user with userId 123
    updateProfileCPSStateMachine.getAndUpdateUserProfile(
        userId = 123, newBio = "Full Stack Developer", continuation = null
    )
}
```

### The Bottom Line

Understanding that Kotlin Coroutines aren't just syntactic sugar, but rather sophisticated compiler transformations using Continuation-Passing Style (CPS) and complex state machines, fundamentally changes how you approach asynchronous Android development. The compiler transforms your sequential suspend functions into resumable state machines that efficiently reuse objects and preserve local state across suspension points, making them far more memory-efficient than callback-based alternatives.
