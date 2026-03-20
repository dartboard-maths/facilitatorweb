import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6 text-center">
          <Image
            src="/images/logo.png"
            alt="Edu Placement logo"
            width={420}
            height={390}
            priority
            className="mb-3"
          />
          <h1 className="display-5 fw-semibold mb-2">Edu Placement</h1>
          <p className="text-secondary mb-4">
            Connect tutors and learners with trusted, location-aware matching.
          </p>
          <nav className="d-flex justify-content-center flex-wrap gap-2">
            <Link href="/" className="btn btn-link">
              Home
            </Link>
            <Link href="/tutors" className="btn btn-link">
              Tutors
            </Link>
            <Link href="/sign-in" className="btn btn-outline-primary">
              Sign in
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}

