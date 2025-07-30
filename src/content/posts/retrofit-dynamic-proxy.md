---
title: "How Retrofit Uses Java Dynamic Proxy to Create API Magic"
meta_title: "Java Dynamic Proxy in Retrofit - Complete Guide"
description: "Learn how Retrofit uses Java Dynamic Proxy to automatically generate API implementations from interfaces with practical examples"
date: 2025-07-30T17:31:00Z
image: "/images/posts/dynamic-proxy-java.png"
categories: ["java", "android"]
tags: ["retrofit", "dynamic-proxy", "java"]
draft: false
---

Retrofit is a type-safe HTTP client for Android and Java. You just define interfaces, and it generates the implementation for you at runtime — but how?

The secret is **Java’s Dynamic Proxy** mechanism.

```java
interface ApiService {
    @GET("users")
    Call<List<User>> getUsers();
}
// Retrofit magically creates an implementation
ApiService api = retrofit.create(ApiService.class);
api.getUsers();
```

Dynamic proxies in Java allow you to create objects that implement one or more interfaces during runtime.

Imagine this:
You have a **Calculator** class with **add()** and **subtract()** methods.

```java
public interface Calculator {
    int add(int a, int b);
    int subtract(int a, int b);
}
```

And the implementation:

```java
public class CalculatorImpl implements Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    public int subtract(int a, int b) {
        return a - b;
    }
}
```

Now imagine your team needs to add logging to track method calls for debugging.
You have several options, but let's see why dynamic proxy is the best choice.

- You could modify **CalculatorImpl** class directly by adding print statements in each method but it violates Open/Closed Principle, breaks the Single Responsibility Principle, and creates scalability issues or
- Implement manual/static proxy by manually creating a class that implements the same interface as the real object, holds a reference to it, and adds extra behavior (like logging) before or after forwarding method calls, like below example.

```java
public class CalculatorLogger implements Calculator {
    private final Calculator target;

    public CalculatorLogger(Calculator target) {
        this.target = target;
    }

    @Override
    public int add(int a, int b) {
        System.out.println("Calling method: add");
        return target.add(a, b);
    }

    @Override
    public int subtract(int a, int b) {
        System.out.println("Calling method: subtract");
        return target.subtract(a, b);
    }
}
```

But Manual/Static Proxy has following disadvantages:

- **Code Duplication**: You write similar proxy code for each interface.
- **Not Scalable**: For many interfaces, maintenance becomes tedious.
- **Tightly Coupled**: Changes in the interface may require proxy updates.
- **Boilerplate Code**: Adds repetitive and verbose code manually.

##### Dynamic Proxy

Wouldn’t it be better to intercept method calls from the outside, add logging, and leave the original logic untouched?

That's what a **dynamic proxy** lets you do. A dynamic proxy is an object created at runtime that implements one or more interfaces and forwards all method calls to a special handler, allowing you to add custom behavior.

To create a dynamic proxy, you use the **Proxy.newProxyInstance()** method.

```java
Object Proxy.newProxyInstance(
    ClassLoader loader,
    Class<?>[] interfaces,
    InvocationHandler handler
)
```

##### What Do These Parameters Mean?

| Parameter    | Type                | Description                                                                                                                                      |
| ------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `loader`     | **ClassLoader**     | The class loader that will define the proxy class. Usually, use the same class loader as your interface: `YourInterface.class.getClassLoader()`. |
| `interfaces` | `Class<?>[]`        | An array of interfaces the proxy should implement. The proxy will behave as if it's an instance of these interfaces.                             |
| `handler`    | `InvocationHandler` | A custom handler that intercepts method calls. Every method call on the proxy is routed through the `invoke()` method of this handler.           |

##### Step 1: The `InvocationHandler`

```java
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;

public class CalculatorInvocationHandler implements InvocationHandler {
    private final Object target;

    public CalculatorInvocationHandler(Object target) {
        this.target = target;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        System.out.println("Calling method: " + method.getName());
        return method.invoke(target, args);
    }
}
```

##### Step 2: Create the Proxy and Use It

```java
import java.lang.reflect.Proxy;

public class DynamicProxyExample {
    public static void main(String[] args) {
        Calculator realCalculator = new CalculatorImpl();

        Calculator proxy = (Calculator) Proxy.newProxyInstance(
            Calculator.class.getClassLoader(),               // ClassLoader
            new Class[]{Calculator.class},                   // Interfaces to implement
            new CalculatorInvocationHandler(realCalculator)  // Custom InvocationHandler
        );

        System.out.println("Add: " + proxy.add(5, 2));
        System.out.println("Subtract: " + proxy.subtract(8, 3));
    }
}
```

###### Output:

```text
Calling method: add
Add: 7
Calling method: subtract
Subtract: 5
```

##### Mini Retrofit Example

Now that we've seen how Java's dynamic proxies work, here's a simplified example inspired by Retrofit.  
This simulation shows how a **MiniRetrofit** class can dynamically generate implementations for multiple service interfaces — without writing manual code for each one.  
Notice how both **UserService** and **ProductService** are handled using the same reusable proxy logic. This is how Retrofit avoids boilerplate and scales cleanly across many APIs.

```java
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

// 1. Define API interfaces
interface UserService {
    Object getUsers();
    Object createUser();
}

interface ProductService {
    Object getProducts();
    Object addProduct();
}

// 2. MiniRetrofit-like class that creates dynamic proxies
class MiniRetrofit {
    public static <T> T create(Class<T> serviceInterface) {
        return (T) Proxy.newProxyInstance(
            serviceInterface.getClassLoader(),
            new Class[]{serviceInterface},
            new InvocationHandler() {
                @Override
                public Object invoke(Object proxy, Method method, Object[] args) {
                    // 1. Receive which interface method was called via the 'method' parameter
                    // 2. Look up metadata for that method (such as HTTP method, URL path, etc.)
                    // 3. Dynamically build and execute the HTTP request based on the metadata and arguments
                    // 4. Return the appropriate result (e.g., a Call object, a coroutine Deferred, a CompletableFuture, or other supported types)
                    return null; // Simulated return
                }
            }
        );
    }
}

// 3. Usage
public class Demo {
    public static void main(String[] args) {
        UserService userService = MiniRetrofit.create(UserService.class);
        ProductService productService = MiniRetrofit.create(ProductService.class);

        userService.getUsers();
        userService.createUser();

        productService.getProducts();
        productService.addProduct();

        System.out.println("Simulated Retrofit-like behavior with multiple services using dynamic proxy.");
    }
}
```

With this setup, the proxy intercepts method calls and injects logic dynamically.

_Note: Dynamic proxies shouldn't be used for concrete classes (only works with interfaces), performance-critical code (reflection overhead). Reflection overhead in Retrofit is tiny compared to waiting for HTTP responses._

Retrofit's elegance lies in making HTTP APIs feel like local method calls. For instance, when you call **api.getCountries()**, you're triggering a runtime translation that converts your method signature into a complete HTTP request. The interface becomes your contract, annotations become configuration, and dynamic proxy invisibly translates. This declarative approach is why Retrofit remains the gold standard.
