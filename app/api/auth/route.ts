import {NextResponse} from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const correctPassword = process.env.PASSWORD;

    if (!correctPassword) {
      console.error("PASSWORD environment variable is not set");
      return NextResponse.json(
        {message: "Server configuration error"},
        {status: 500}
      );
    }

    if (password === correctPassword) {
      return NextResponse.json(
        {message: "Authentication successful"},
        {status: 200}
      );
    } else {
      return NextResponse.json(
        {message: "Invalid password"},
        {status: 401}
      );
    }
  } catch (error) {
    console.error("Error in authentication:", error);
    return NextResponse.json(
      {message: "Authentication failed"},
      {status: 400}
    );
  }
}