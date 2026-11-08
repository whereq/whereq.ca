import PageLayout from "@/layouts/PageLayout";

export const Contact = () => {
  return (
    <PageLayout>
        <div className="overflow-y-auto flex items-start justify-center p-4">
          <div className="w-full max-w-4xl p-10 shadow-lg rounded-md mt-32" style={{ backgroundColor: '#1c2a39' }}>
            <h1 className="text-4xl font-bold mb-6 text-orange-300 text-center">Contact Me</h1>
            <p className="text-lg text-orange-300 mb-6 text-left">
              I'm open to <span className="font-extrabold">100% remote job opportunities</span>, focusing on roles as a{' '}
              <span className="font-extrabold">Full Stack Senior Developer</span>. Feel free to reach out if you're looking
              for someone with deep technical expertise and a passion for building robust, scalable software solutions.
            </p>

            <hr className="my-6 border-t-2 border-orange-300" />
            <div className="mb-6 text-left">
              <div className="flex items-center">
                <h3 className="text-2xl font-bold text-orange-300 mr-4">📧 Email</h3>
                <ul className="list-none">
                  <li>
                    <a
                      href="mailto:whereq@gmail.com"
                      className="text-orange-500 font-bold hover:underline"
                    >
                      whereq@gmail.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mb-6 text-left">
              <div className="flex items-center">
                <h3 className="text-2xl font-bold text-orange-300 mr-4">🌐 LinkedIn</h3>
                <p>
                  <a
                    href="https://www.linkedin.com/in/dazhi-zhang-tony-19933019/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 font-bold hover:underline"
                  >
                    linkedin.com/in/dazhi-zhang-tony-19933019
                  </a>
                </p>
              </div>
            </div>

            <footer className="mt-10">
              <p className="text-left text-orange-300">
                Let's create something exceptional together! Reach out today.
              </p>
            </footer>
          </div>
        </div>
    </PageLayout>
  );
};


export default Contact;