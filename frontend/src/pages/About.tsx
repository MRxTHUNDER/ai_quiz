import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, GraduationCap, Code, Users, Target, Palette, Monitor } from 'lucide-react';
import TeamCard from '../components/TeamCard';
import ValueCard from '../components/ValueCard';
import Button from '../components/Button';

function About() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Meet the Minds Behind Quiz Genius AI
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We are a passionate team of educators, AI specialists, and developers dedicated to transforming learning through intelligent, personalized quizzes.
          </p>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Core Team</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-16">
            <TeamCard
              name="Dr. Alistair Finch"
              role="Chief AI Scientist"
              description="With a Ph.D. in Artificial Intelligence from Stanford, Dr. Finch leads our innovative AI quiz generation engine. His expertise in natural language processing drives our platform's intelligence."
              avatar="https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1"
            />
            <TeamCard
              name="Maria Rodriguez"
              role="Head of Content & Education"
              description="Maria, a former high school educator with a Master's in Curriculum Design, ensures all quizzes align with educational standards and learning objectives for maximum impact."
              avatar="https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1"
            />
            <TeamCard
              name="David Chen"
              role="Lead Software Engineer"
              description="David, a full-stack developer with 10+ years experience, brings our AI and educational vision to life through robust and scalable software architecture."
              avatar="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1"
            />
            <TeamCard
              name="Sarah Miller"
              role="Product Manager"
              description="Sarah bridges the gap between user needs and technical capabilities, shaping the product roadmap with a keen eye for innovative features that empower student learning and growth."
              avatar="https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1"
            />
            <TeamCard
              name="Jamal Adebayo"
              role="AI Ethics & Fairness Lead"
              description="With a background in computational ethics, Jamal ensures our AI-generated quizzes are unbiased, fair, and accessible to all students, upholding our commitment to equitable education."
              avatar="https://images.pexels.com/photos/2381069/pexels-photo-2381069.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1"
            />
            <TeamCard
              name="Emily White"
              role="UX/UI Designer"
              description="Emily designs intuitive and engaging interfaces, making the learning experience on Quiz Genius AI enjoyable and accessible for students of all ages and technical proficiencies."
              avatar="https://images.pexels.com/photos/3756681/pexels-photo-3756681.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1"
            />
          </div>
        </div>
      </div>

      {/* Philosophy & Values Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Philosophy & Values</h2>
              <p className="text-gray-600 leading-relaxed mb-8">
                At Quiz Genius AI, we believe in the power of technology to enhance education. Our core values drive us to build a platform that is not only smart but also responsible, impactful, and genuinely helpful for every student.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ValueCard
                  icon={<Lightbulb className="h-6 w-6" />}
                  title="Innovation in Learning"
                  description="We constantly push the boundaries of AI to create smarter, more effective ways for students to learn and test their knowledge."
                />
                <ValueCard
                  icon={<GraduationCap className="h-6 w-6" />}
                  title="Educational Excellence"
                  description="Our team, rooted in educational expertise, ensures that every quiz contributes meaningfully to a student's academic growth."
                />
                <ValueCard
                  icon={<Code className="h-6 w-6" />}
                  title="Ethical AI Development"
                  description="We are committed to developing AI that is fair, unbiased, and serves all learners equitably, fostering an inclusive learning environment."
                />
                <ValueCard
                  icon={<Users className="h-6 w-6" />}
                  title="User-Centric Design"
                  description="Every feature and design choice is made with the student in mind, prioritizing intuitive interfaces and engaging experiences."
                />
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl blur-xl opacity-20"></div>
              <img 
                src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                alt="Team collaboration"
                className="relative rounded-2xl shadow-2xl w-full h-96 object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Join Our Mission Section */}
      <div className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-6">Want to Join Our Mission?</h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            We're always looking for passionate individuals to help us revolutionize the way students learn. If you're excited about education and AI, check out our career opportunities.
          </p>
          <Button 
            className="bg-white text-blue-600 hover:bg-gray-50"
            onClick={() => navigate("/contact")}
          >
            Explore Careers
          </Button>
        </div>
      </div>
    </div>
  );
}

export default About;