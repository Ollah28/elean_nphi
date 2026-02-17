import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Award, Download, Calendar, BookOpen } from 'lucide-react';
import { jsPDF } from 'jspdf';

const Certificates: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const generateCertificate = (certificate: typeof user.certificates[0]) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Background
    doc.setFillColor(240, 247, 255);
    doc.rect(0, 0, 297, 210, 'F');

    // Border
    doc.setDrawColor(0, 122, 204);
    doc.setLineWidth(3);
    doc.rect(10, 10, 277, 190, 'S');

    // Inner border
    doc.setDrawColor(0, 122, 204);
    doc.setLineWidth(0.5);
    doc.rect(15, 15, 267, 180, 'S');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(0, 82, 164);
    doc.text('Certificate of Completion', 148.5, 50, { align: 'center' });

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('This is to certify that', 148.5, 70, { align: 'center' });

    // Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    doc.text(user.name, 148.5, 90, { align: 'center' });

    // Course info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('has successfully completed the course', 148.5, 105, { align: 'center' });

    // Course title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(0, 82, 164);
    doc.text(certificate.courseName, 148.5, 120, { align: 'center' });

    // CPD Points
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(34, 139, 34);
    doc.text(`${certificate.cpdPoints} CPD Points Earned`, 148.5, 135, { align: 'center' });

    // Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const date = new Date(certificate.completedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Completed on: ${date}`, 148.5, 155, { align: 'center' });

    // Certificate ID
    doc.setFontSize(10);
    doc.text(`Certificate ID: ${certificate.id}`, 148.5, 165, { align: 'center' });

    // Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('Health eLearning Platform', 148.5, 185, { align: 'center' });

    // Save
    doc.save(`Certificate-${certificate.courseName.replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        {/* Header */}
        <section className="bg-card border-b border-border py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">My Certificates</h1>
                <p className="text-muted-foreground">
                  Download and share your earned certificates
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-success/10 rounded-xl">
                <Award className="w-6 h-6 text-success" />
                <div>
                  <p className="text-2xl font-bold text-success">{user.totalCpdPoints}</p>
                  <p className="text-xs text-muted-foreground">Total CPD Points</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Certificates Grid */}
        <section className="container mx-auto px-4 py-8">
          {user.certificates.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Award className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">No Certificates Yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Complete courses to earn certificates and CPD points. Your achievements will appear here.
              </p>
              <a href="/courses" className="btn-primary inline-block">
                Browse Courses
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {user.certificates.map((cert) => (
                <div key={cert.id} className="card-elevated overflow-hidden group">
                  {/* Certificate Preview */}
                  <div className="relative h-48 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-6">
                    <div className="absolute inset-0 flex items-center justify-center opacity-10">
                      <Award className="w-32 h-32 text-primary" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Certificate of Completion</p>
                        <h3 className="text-lg font-bold text-foreground mt-2 line-clamp-2">
                          {cert.courseName}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="badge badge-success">
                          <Award className="w-3 h-3 mr-1" />
                          {cert.cpdPoints} CPD
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(cert.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generateCertificate(cert)}
                        className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      Certificate ID: {cert.id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CPD Summary */}
        {user.certificates.length > 0 && (
          <section className="container mx-auto px-4 pb-8">
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">CPD Points Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <BookOpen className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{user.certificates.length}</p>
                  <p className="text-xs text-muted-foreground">Courses Completed</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Award className="w-6 h-6 mx-auto mb-2 text-success" />
                  <p className="text-2xl font-bold text-foreground">{user.totalCpdPoints}</p>
                  <p className="text-xs text-muted-foreground">Total CPD Points</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Calendar className="w-6 h-6 mx-auto mb-2 text-accent" />
                  <p className="text-2xl font-bold text-foreground">
                    {user.certificates.length > 0 
                      ? new Date(user.certificates[user.certificates.length - 1].completedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      : 'N/A'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Last Earned</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Award className="w-6 h-6 mx-auto mb-2 text-warning" />
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(user.totalCpdPoints / Math.max(user.certificates.length, 1))}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Points/Course</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Certificates;
