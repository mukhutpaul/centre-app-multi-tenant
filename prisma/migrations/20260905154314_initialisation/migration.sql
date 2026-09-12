-- CreateTable
CREATE TABLE "CentreFormation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ESSAI',
    "email" TEXT,
    "telephone" TEXT,
    "siteWeb" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "pays" TEXT,
    "codePostal" TEXT,
    "logoUrl" TEXT,
    "devise" TEXT NOT NULL DEFAULT 'XAF',
    "fuseauHoraire" TEXT NOT NULL DEFAULT 'Africa/Douala',
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateActivation" DATETIME,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT,
    "prenom" TEXT,
    "nom" TEXT,
    "telephone" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "avatarUrl" TEXT,
    "derniereConnexion" DATETIME,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Membre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'INVITE',
    "dateInvitation" DATETIME,
    "dateActivation" DATETIME,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Membre_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membre_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Apprenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "numero" TEXT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "dateNaissance" DATETIME,
    "lieuNaissance" TEXT,
    "sexe" TEXT,
    "nationalite" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "pays" TEXT,
    "profession" TEXT,
    "contactUrgenceNom" TEXT,
    "contactUrgenceTelephone" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "notes" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Apprenant_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Formateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "specialite" TEXT,
    "biographie" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Formateur_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Formateur_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "objectifs" TEXT,
    "prerequis" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PRESENTIEL',
    "dureeHeures" DECIMAL,
    "nombreModules" INTEGER NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Formation_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModuleFormation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "dureeHeures" DECIMAL,
    "coefficient" DECIMAL NOT NULL DEFAULT 1,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "ModuleFormation_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Competence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Competence_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ModuleFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionFormation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME NOT NULL,
    "capacite" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'PLANIFIEE',
    "ouvertureInscriptions" DATETIME,
    "fermetureInscriptions" DATETIME,
    "notes" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "SessionFormation_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionFormation_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModuleSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "dateDebut" DATETIME,
    "dateFin" DATETIME,
    CONSTRAINT "ModuleSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModuleSession_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ModuleFormation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormateurSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "formateurId" TEXT NOT NULL,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormateurSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FormateurSession_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Formateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormateurModuleSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleSessionId" TEXT NOT NULL,
    "formateurId" TEXT NOT NULL,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormateurModuleSession_moduleSessionId_fkey" FOREIGN KEY ("moduleSessionId") REFERENCES "ModuleSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FormateurModuleSession_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Formateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Salle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "capacite" INTEGER,
    "localisation" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Salle_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Planning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "salleId" TEXT,
    "titre" TEXT,
    "debut" DATETIME NOT NULL,
    "fin" DATETIME NOT NULL,
    "description" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Planning_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Planning_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "Salle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apprenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "typeFinancement" TEXT NOT NULL DEFAULT 'AUTO_FINANCEMENT',
    "dateInscription" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montantConvenu" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Inscription_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inscription_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionFormation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planningId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "heureArrivee" DATETIME,
    "heureDepart" DATETIME,
    "minutesRetard" INTEGER,
    "motif" TEXT,
    "commentaire" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Presence_planningId_fkey" FOREIGN KEY ("planningId") REFERENCES "Planning" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Presence_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TarifFormation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "montant" DECIMAL NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'XAF',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "TarifFormation_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TarifFormation_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModeleEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "formationId" TEXT,
    "moduleId" TEXT,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "noteMaximale" DECIMAL NOT NULL DEFAULT 20,
    "notePassage" DECIMAL,
    "coefficient" DECIMAL NOT NULL DEFAULT 1,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "ModeleEvaluation_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModeleEvaluation_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ModeleEvaluation_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ModuleFormation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CritereEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modeleId" TEXT NOT NULL,
    "competenceId" TEXT,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "noteMaximale" DECIMAL NOT NULL DEFAULT 20,
    "coefficient" DECIMAL NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "CritereEvaluation_modeleId_fkey" FOREIGN KEY ("modeleId") REFERENCES "ModeleEvaluation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CritereEvaluation_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvaluationResultat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inscriptionId" TEXT NOT NULL,
    "moduleSessionId" TEXT NOT NULL,
    "modeleId" TEXT,
    "evaluateurId" TEXT,
    "apprenantId" TEXT NOT NULL,
    "note" DECIMAL,
    "noteMaximale" DECIMAL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "resultat" TEXT NOT NULL DEFAULT 'NON_EVALUE',
    "commentaire" TEXT,
    "dateEvaluation" DATETIME,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "EvaluationResultat_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvaluationResultat_moduleSessionId_fkey" FOREIGN KEY ("moduleSessionId") REFERENCES "ModuleSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EvaluationResultat_modeleId_fkey" FOREIGN KEY ("modeleId") REFERENCES "ModeleEvaluation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EvaluationResultat_evaluateurId_fkey" FOREIGN KEY ("evaluateurId") REFERENCES "Formateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EvaluationResultat_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoteCritere" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluationId" TEXT NOT NULL,
    "critereId" TEXT NOT NULL,
    "note" DECIMAL,
    "commentaire" TEXT,
    CONSTRAINT "NoteCritere_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "EvaluationResultat" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoteCritere_critereId_fkey" FOREIGN KEY ("critereId") REFERENCES "CritereEvaluation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResultatFormation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apprenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "moyenneGenerale" DECIMAL,
    "tauxPresence" DECIMAL,
    "nombreModules" INTEGER NOT NULL DEFAULT 0,
    "modulesReussis" INTEGER NOT NULL DEFAULT 0,
    "modulesEchoues" INTEGER NOT NULL DEFAULT 0,
    "resultat" TEXT NOT NULL DEFAULT 'NON_EVALUE',
    "commentaire" TEXT,
    "dateCalcul" DATETIME,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "ResultatFormation_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ResultatFormation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionFormation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ResultatFormation_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Convention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nomOrganisme" TEXT NOT NULL,
    "emailOrganisme" TEXT,
    "telephoneOrganisme" TEXT,
    "adresseOrganisme" TEXT,
    "nomContact" TEXT,
    "dateDebut" DATETIME,
    "dateFin" DATETIME,
    "montant" DECIMAL NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateSignature" DATETIME,
    "observations" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Convention_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Convention_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "inscriptionId" TEXT,
    "numero" TEXT NOT NULL,
    "dateEmission" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" DATETIME,
    "sousTotal" DECIMAL NOT NULL DEFAULT 0,
    "remise" DECIMAL NOT NULL DEFAULT 0,
    "taxe" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "montantPaye" DECIMAL NOT NULL DEFAULT 0,
    "montantDu" DECIMAL NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Facture_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Facture_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LigneFacture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "factureId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantite" DECIMAL NOT NULL DEFAULT 1,
    "prixUnitaire" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "LigneFacture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EcheancePaiement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "inscriptionId" TEXT,
    "factureId" TEXT,
    "numero" INTEGER NOT NULL,
    "dateEcheance" DATETIME NOT NULL,
    "montant" DECIMAL NOT NULL,
    "montantPaye" DECIMAL NOT NULL DEFAULT 0,
    "montantDu" DECIMAL NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "notes" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "EcheancePaiement_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EcheancePaiement_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EcheancePaiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "apprenantId" TEXT,
    "inscriptionId" TEXT,
    "factureId" TEXT,
    "echeanceId" TEXT,
    "reference" TEXT NOT NULL,
    "montant" DECIMAL NOT NULL,
    "mode" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "datePaiement" DATETIME,
    "referenceTransaction" TEXT,
    "notes" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Paiement_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Paiement_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Paiement_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Paiement_echeanceId_fkey" FOREIGN KEY ("echeanceId") REFERENCES "EcheancePaiement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Jury" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "datePrevue" DATETIME,
    "lieu" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'PLANIFIE',
    "decision" TEXT,
    "notesDeliberation" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Jury_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Jury_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionFormation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MembreJury" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "juryId" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "organisme" TEXT,
    "role" TEXT NOT NULL DEFAULT 'MEMBRE',
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MembreJury_juryId_fkey" FOREIGN KEY ("juryId") REFERENCES "Jury" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvaluationJury" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "juryId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "apprenantId" TEXT NOT NULL,
    "membreJuryId" TEXT NOT NULL,
    "note" DECIMAL,
    "decision" TEXT,
    "commentaire" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "EvaluationJury_juryId_fkey" FOREIGN KEY ("juryId") REFERENCES "Jury" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvaluationJury_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EvaluationJury_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EvaluationJury_membreJuryId_fkey" FOREIGN KEY ("membreJuryId") REFERENCES "MembreJury" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "apprenantId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "resultatFormationId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "dateObtention" DATETIME,
    "dateExpiration" DATETIME,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "mention" TEXT,
    "observations" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Certification_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Certification_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Certification_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Certification_resultatFormationId_fkey" FOREIGN KEY ("resultatFormationId") REFERENCES "ResultatFormation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "apprenantId" TEXT,
    "conventionId" TEXT,
    "factureId" TEXT,
    "juryId" TEXT,
    "certificationId" TEXT,
    "type" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "urlFichier" TEXT NOT NULL,
    "typeMime" TEXT,
    "taille" INTEGER,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_juryId_fkey" FOREIGN KEY ("juryId") REFERENCES "Jury" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampagneFormation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "CampagneFormation_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParametreCentre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "nomResponsable" TEXT,
    "emailContact" TEXT,
    "telephoneContact" TEXT,
    "prefixeApprenant" TEXT NOT NULL DEFAULT 'APP',
    "prefixeInscription" TEXT NOT NULL DEFAULT 'INS',
    "prefixeFacture" TEXT NOT NULL DEFAULT 'FAC',
    "prefixeConvention" TEXT NOT NULL DEFAULT 'CON',
    "prefixeCertification" TEXT NOT NULL DEFAULT 'CERT',
    "conditionsPaiement" TEXT,
    "piedDePageDocuments" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "ParametreCentre_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lueLe" DATETIME,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvitationUtilisateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expireLe" DATETIME NOT NULL,
    "utiliseLe" DATETIME,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvitationUtilisateur_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvitationUtilisateur_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionUtilisateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expireLe" DATETIME NOT NULL,
    "adresseIP" TEXT,
    "userAgent" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionUtilisateur_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "anciennesDonnees" TEXT,
    "nouvellesDonnees" TEXT,
    "adresseIP" TEXT,
    "userAgent" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalAudit_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalAudit_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanSaaS" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "prix" DECIMAL NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'XAF',
    "dureeJours" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LimitePlanSaaS" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "valeur" INTEGER NOT NULL,
    "illimite" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LimitePlanSaaS_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanSaaS" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AbonnementSaaS" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centreId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ESSAI',
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME NOT NULL,
    "prochaineEcheance" DATETIME,
    "prix" DECIMAL NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'XAF',
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "AbonnementSaaS_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "CentreFormation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AbonnementSaaS_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanSaaS" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FactureSaaS" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "abonnementId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "dateEmission" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" DATETIME,
    "sousTotal" DECIMAL NOT NULL DEFAULT 0,
    "taxe" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "montantPaye" DECIMAL NOT NULL DEFAULT 0,
    "montantDu" DECIMAL NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "FactureSaaS_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "AbonnementSaaS" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaiementSaaS" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "abonnementId" TEXT NOT NULL,
    "factureId" TEXT,
    "reference" TEXT NOT NULL,
    "montant" DECIMAL NOT NULL,
    "mode" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "datePaiement" DATETIME,
    "referenceTransaction" TEXT,
    "notes" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "PaiementSaaS_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "AbonnementSaaS" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaiementSaaS_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "FactureSaaS" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CentreFormation_slug_key" ON "CentreFormation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CentreFormation_code_key" ON "CentreFormation"("code");

-- CreateIndex
CREATE INDEX "CentreFormation_statut_idx" ON "CentreFormation"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Membre_centreId_idx" ON "Membre"("centreId");

-- CreateIndex
CREATE INDEX "Membre_centreId_role_idx" ON "Membre"("centreId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membre_utilisateurId_centreId_key" ON "Membre"("utilisateurId", "centreId");

-- CreateIndex
CREATE INDEX "Apprenant_centreId_idx" ON "Apprenant"("centreId");

-- CreateIndex
CREATE INDEX "Apprenant_centreId_nom_idx" ON "Apprenant"("centreId", "nom");

-- CreateIndex
CREATE INDEX "Apprenant_centreId_email_idx" ON "Apprenant"("centreId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Apprenant_centreId_numero_key" ON "Apprenant"("centreId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Formateur_utilisateurId_key" ON "Formateur"("utilisateurId");

-- CreateIndex
CREATE INDEX "Formateur_centreId_idx" ON "Formateur"("centreId");

-- CreateIndex
CREATE INDEX "Formation_centreId_idx" ON "Formation"("centreId");

-- CreateIndex
CREATE INDEX "Formation_centreId_statut_idx" ON "Formation"("centreId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Formation_centreId_code_key" ON "Formation"("centreId", "code");

-- CreateIndex
CREATE INDEX "ModuleFormation_formationId_idx" ON "ModuleFormation"("formationId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleFormation_formationId_code_key" ON "ModuleFormation"("formationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleFormation_formationId_position_key" ON "ModuleFormation"("formationId", "position");

-- CreateIndex
CREATE INDEX "Competence_moduleId_idx" ON "Competence"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Competence_moduleId_code_key" ON "Competence"("moduleId", "code");

-- CreateIndex
CREATE INDEX "SessionFormation_centreId_idx" ON "SessionFormation"("centreId");

-- CreateIndex
CREATE INDEX "SessionFormation_centreId_statut_idx" ON "SessionFormation"("centreId", "statut");

-- CreateIndex
CREATE INDEX "SessionFormation_formationId_idx" ON "SessionFormation"("formationId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionFormation_centreId_code_key" ON "SessionFormation"("centreId", "code");

-- CreateIndex
CREATE INDEX "ModuleSession_sessionId_idx" ON "ModuleSession"("sessionId");

-- CreateIndex
CREATE INDEX "ModuleSession_moduleId_idx" ON "ModuleSession"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleSession_sessionId_moduleId_key" ON "ModuleSession"("sessionId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleSession_sessionId_position_key" ON "ModuleSession"("sessionId", "position");

-- CreateIndex
CREATE INDEX "FormateurSession_sessionId_idx" ON "FormateurSession"("sessionId");

-- CreateIndex
CREATE INDEX "FormateurSession_formateurId_idx" ON "FormateurSession"("formateurId");

-- CreateIndex
CREATE UNIQUE INDEX "FormateurSession_sessionId_formateurId_key" ON "FormateurSession"("sessionId", "formateurId");

-- CreateIndex
CREATE INDEX "FormateurModuleSession_formateurId_idx" ON "FormateurModuleSession"("formateurId");

-- CreateIndex
CREATE UNIQUE INDEX "FormateurModuleSession_moduleSessionId_formateurId_key" ON "FormateurModuleSession"("moduleSessionId", "formateurId");

-- CreateIndex
CREATE INDEX "Salle_centreId_idx" ON "Salle"("centreId");

-- CreateIndex
CREATE UNIQUE INDEX "Salle_centreId_code_key" ON "Salle"("centreId", "code");

-- CreateIndex
CREATE INDEX "Planning_sessionId_debut_idx" ON "Planning"("sessionId", "debut");

-- CreateIndex
CREATE INDEX "Planning_salleId_debut_idx" ON "Planning"("salleId", "debut");

-- CreateIndex
CREATE INDEX "Inscription_apprenantId_idx" ON "Inscription"("apprenantId");

-- CreateIndex
CREATE INDEX "Inscription_sessionId_idx" ON "Inscription"("sessionId");

-- CreateIndex
CREATE INDEX "Inscription_sessionId_statut_idx" ON "Inscription"("sessionId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_apprenantId_sessionId_key" ON "Inscription"("apprenantId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_sessionId_numero_key" ON "Inscription"("sessionId", "numero");

-- CreateIndex
CREATE INDEX "Presence_planningId_idx" ON "Presence"("planningId");

-- CreateIndex
CREATE INDEX "Presence_inscriptionId_idx" ON "Presence"("inscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_planningId_inscriptionId_key" ON "Presence"("planningId", "inscriptionId");

-- CreateIndex
CREATE INDEX "TarifFormation_centreId_idx" ON "TarifFormation"("centreId");

-- CreateIndex
CREATE INDEX "TarifFormation_formationId_idx" ON "TarifFormation"("formationId");

-- CreateIndex
CREATE INDEX "ModeleEvaluation_centreId_idx" ON "ModeleEvaluation"("centreId");

-- CreateIndex
CREATE INDEX "ModeleEvaluation_formationId_idx" ON "ModeleEvaluation"("formationId");

-- CreateIndex
CREATE INDEX "ModeleEvaluation_moduleId_idx" ON "ModeleEvaluation"("moduleId");

-- CreateIndex
CREATE INDEX "CritereEvaluation_modeleId_idx" ON "CritereEvaluation"("modeleId");

-- CreateIndex
CREATE INDEX "CritereEvaluation_competenceId_idx" ON "CritereEvaluation"("competenceId");

-- CreateIndex
CREATE INDEX "EvaluationResultat_inscriptionId_idx" ON "EvaluationResultat"("inscriptionId");

-- CreateIndex
CREATE INDEX "EvaluationResultat_moduleSessionId_idx" ON "EvaluationResultat"("moduleSessionId");

-- CreateIndex
CREATE INDEX "EvaluationResultat_evaluateurId_idx" ON "EvaluationResultat"("evaluateurId");

-- CreateIndex
CREATE INDEX "EvaluationResultat_apprenantId_idx" ON "EvaluationResultat"("apprenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationResultat_inscriptionId_moduleSessionId_key" ON "EvaluationResultat"("inscriptionId", "moduleSessionId");

-- CreateIndex
CREATE INDEX "NoteCritere_critereId_idx" ON "NoteCritere"("critereId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteCritere_evaluationId_critereId_key" ON "NoteCritere"("evaluationId", "critereId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultatFormation_inscriptionId_key" ON "ResultatFormation"("inscriptionId");

-- CreateIndex
CREATE INDEX "ResultatFormation_sessionId_idx" ON "ResultatFormation"("sessionId");

-- CreateIndex
CREATE INDEX "ResultatFormation_apprenantId_idx" ON "ResultatFormation"("apprenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultatFormation_apprenantId_sessionId_key" ON "ResultatFormation"("apprenantId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Convention_inscriptionId_key" ON "Convention"("inscriptionId");

-- CreateIndex
CREATE INDEX "Convention_centreId_idx" ON "Convention"("centreId");

-- CreateIndex
CREATE INDEX "Convention_centreId_statut_idx" ON "Convention"("centreId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Convention_centreId_numero_key" ON "Convention"("centreId", "numero");

-- CreateIndex
CREATE INDEX "Facture_centreId_idx" ON "Facture"("centreId");

-- CreateIndex
CREATE INDEX "Facture_centreId_statut_idx" ON "Facture"("centreId", "statut");

-- CreateIndex
CREATE INDEX "Facture_inscriptionId_idx" ON "Facture"("inscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_centreId_numero_key" ON "Facture"("centreId", "numero");

-- CreateIndex
CREATE INDEX "LigneFacture_factureId_idx" ON "LigneFacture"("factureId");

-- CreateIndex
CREATE INDEX "EcheancePaiement_centreId_idx" ON "EcheancePaiement"("centreId");

-- CreateIndex
CREATE INDEX "EcheancePaiement_inscriptionId_idx" ON "EcheancePaiement"("inscriptionId");

-- CreateIndex
CREATE INDEX "EcheancePaiement_factureId_idx" ON "EcheancePaiement"("factureId");

-- CreateIndex
CREATE INDEX "EcheancePaiement_dateEcheance_idx" ON "EcheancePaiement"("dateEcheance");

-- CreateIndex
CREATE INDEX "Paiement_centreId_idx" ON "Paiement"("centreId");

-- CreateIndex
CREATE INDEX "Paiement_apprenantId_idx" ON "Paiement"("apprenantId");

-- CreateIndex
CREATE INDEX "Paiement_inscriptionId_idx" ON "Paiement"("inscriptionId");

-- CreateIndex
CREATE INDEX "Paiement_factureId_idx" ON "Paiement"("factureId");

-- CreateIndex
CREATE INDEX "Paiement_echeanceId_idx" ON "Paiement"("echeanceId");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_centreId_reference_key" ON "Paiement"("centreId", "reference");

-- CreateIndex
CREATE INDEX "Jury_centreId_idx" ON "Jury"("centreId");

-- CreateIndex
CREATE INDEX "Jury_sessionId_idx" ON "Jury"("sessionId");

-- CreateIndex
CREATE INDEX "MembreJury_juryId_idx" ON "MembreJury"("juryId");

-- CreateIndex
CREATE INDEX "EvaluationJury_inscriptionId_idx" ON "EvaluationJury"("inscriptionId");

-- CreateIndex
CREATE INDEX "EvaluationJury_apprenantId_idx" ON "EvaluationJury"("apprenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationJury_juryId_inscriptionId_membreJuryId_key" ON "EvaluationJury"("juryId", "inscriptionId", "membreJuryId");

-- CreateIndex
CREATE UNIQUE INDEX "Certification_resultatFormationId_key" ON "Certification"("resultatFormationId");

-- CreateIndex
CREATE INDEX "Certification_centreId_idx" ON "Certification"("centreId");

-- CreateIndex
CREATE INDEX "Certification_apprenantId_idx" ON "Certification"("apprenantId");

-- CreateIndex
CREATE INDEX "Certification_formationId_idx" ON "Certification"("formationId");

-- CreateIndex
CREATE UNIQUE INDEX "Certification_centreId_numero_key" ON "Certification"("centreId", "numero");

-- CreateIndex
CREATE INDEX "Document_centreId_idx" ON "Document"("centreId");

-- CreateIndex
CREATE INDEX "Document_apprenantId_idx" ON "Document"("apprenantId");

-- CreateIndex
CREATE INDEX "Document_conventionId_idx" ON "Document"("conventionId");

-- CreateIndex
CREATE INDEX "Document_factureId_idx" ON "Document"("factureId");

-- CreateIndex
CREATE INDEX "Document_juryId_idx" ON "Document"("juryId");

-- CreateIndex
CREATE INDEX "Document_certificationId_idx" ON "Document"("certificationId");

-- CreateIndex
CREATE INDEX "CampagneFormation_centreId_idx" ON "CampagneFormation"("centreId");

-- CreateIndex
CREATE INDEX "CampagneFormation_centreId_active_idx" ON "CampagneFormation"("centreId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ParametreCentre_centreId_key" ON "ParametreCentre"("centreId");

-- CreateIndex
CREATE INDEX "Notification_centreId_idx" ON "Notification"("centreId");

-- CreateIndex
CREATE INDEX "Notification_utilisateurId_lueLe_idx" ON "Notification"("utilisateurId", "lueLe");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationUtilisateur_token_key" ON "InvitationUtilisateur"("token");

-- CreateIndex
CREATE INDEX "InvitationUtilisateur_centreId_idx" ON "InvitationUtilisateur"("centreId");

-- CreateIndex
CREATE INDEX "InvitationUtilisateur_email_idx" ON "InvitationUtilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SessionUtilisateur_token_key" ON "SessionUtilisateur"("token");

-- CreateIndex
CREATE INDEX "SessionUtilisateur_utilisateurId_idx" ON "SessionUtilisateur"("utilisateurId");

-- CreateIndex
CREATE INDEX "SessionUtilisateur_expireLe_idx" ON "SessionUtilisateur"("expireLe");

-- CreateIndex
CREATE INDEX "JournalAudit_centreId_creeLe_idx" ON "JournalAudit"("centreId", "creeLe");

-- CreateIndex
CREATE INDEX "JournalAudit_entite_entiteId_idx" ON "JournalAudit"("entite", "entiteId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanSaaS_code_key" ON "PlanSaaS"("code");

-- CreateIndex
CREATE INDEX "LimitePlanSaaS_planId_idx" ON "LimitePlanSaaS"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "LimitePlanSaaS_planId_code_key" ON "LimitePlanSaaS"("planId", "code");

-- CreateIndex
CREATE INDEX "AbonnementSaaS_centreId_idx" ON "AbonnementSaaS"("centreId");

-- CreateIndex
CREATE INDEX "AbonnementSaaS_planId_idx" ON "AbonnementSaaS"("planId");

-- CreateIndex
CREATE INDEX "AbonnementSaaS_statut_idx" ON "AbonnementSaaS"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "FactureSaaS_numero_key" ON "FactureSaaS"("numero");

-- CreateIndex
CREATE INDEX "FactureSaaS_abonnementId_idx" ON "FactureSaaS"("abonnementId");

-- CreateIndex
CREATE INDEX "FactureSaaS_statut_idx" ON "FactureSaaS"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "PaiementSaaS_reference_key" ON "PaiementSaaS"("reference");

-- CreateIndex
CREATE INDEX "PaiementSaaS_abonnementId_idx" ON "PaiementSaaS"("abonnementId");

-- CreateIndex
CREATE INDEX "PaiementSaaS_factureId_idx" ON "PaiementSaaS"("factureId");

-- CreateIndex
CREATE INDEX "PaiementSaaS_statut_idx" ON "PaiementSaaS"("statut");
