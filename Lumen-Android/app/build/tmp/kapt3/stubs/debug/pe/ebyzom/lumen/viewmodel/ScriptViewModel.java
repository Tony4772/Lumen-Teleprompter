package pe.ebyzom.lumen.viewmodel;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000H\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\u0010 \n\u0002\b\u0005\n\u0002\u0010\u0002\n\u0002\b\u0003\n\u0002\u0010\t\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0002\b\u0002\n\u0002\u0010\b\n\u0002\b\u0002\u0018\u00002\u00020\u0001B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\u000e\u0010\u000f\u001a\u00020\u00102\u0006\u0010\u0011\u001a\u00020\u0007J\u000e\u0010\u0012\u001a\u00020\u00102\u0006\u0010\u0013\u001a\u00020\u0014J*\u0010\u0015\u001a\u00020\u00102\u0006\u0010\u0016\u001a\u00020\u00172\u0006\u0010\u0018\u001a\u00020\u00172\b\b\u0002\u0010\u0019\u001a\u00020\u001a2\b\b\u0002\u0010\u001b\u001a\u00020\u001aR\u0016\u0010\u0005\u001a\n\u0012\u0006\u0012\u0004\u0018\u00010\u00070\u0006X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u001d\u0010\b\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u00070\n0\t\u00a2\u0006\b\n\u0000\u001a\u0004\b\u000b\u0010\fR\u0019\u0010\r\u001a\n\u0012\u0006\u0012\u0004\u0018\u00010\u00070\t\u00a2\u0006\b\n\u0000\u001a\u0004\b\u000e\u0010\fR\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u001c"}, d2 = {"Lpe/ebyzom/lumen/viewmodel/ScriptViewModel;", "Landroidx/lifecycle/ViewModel;", "repository", "Lpe/ebyzom/lumen/data/repository/ScriptRepository;", "(Lpe/ebyzom/lumen/data/repository/ScriptRepository;)V", "_currentScript", "Lkotlinx/coroutines/flow/MutableStateFlow;", "Lpe/ebyzom/lumen/model/Script;", "allScripts", "Lkotlinx/coroutines/flow/StateFlow;", "", "getAllScripts", "()Lkotlinx/coroutines/flow/StateFlow;", "currentScript", "getCurrentScript", "deleteScript", "", "script", "loadScript", "id", "", "saveScript", "title", "", "content", "wpm", "", "fontSize", "app_debug"})
public final class ScriptViewModel extends androidx.lifecycle.ViewModel {
    @org.jetbrains.annotations.NotNull
    private final pe.ebyzom.lumen.data.repository.ScriptRepository repository = null;
    @org.jetbrains.annotations.NotNull
    private final kotlinx.coroutines.flow.StateFlow<java.util.List<pe.ebyzom.lumen.model.Script>> allScripts = null;
    @org.jetbrains.annotations.NotNull
    private final kotlinx.coroutines.flow.MutableStateFlow<pe.ebyzom.lumen.model.Script> _currentScript = null;
    @org.jetbrains.annotations.NotNull
    private final kotlinx.coroutines.flow.StateFlow<pe.ebyzom.lumen.model.Script> currentScript = null;
    
    public ScriptViewModel(@org.jetbrains.annotations.NotNull
    pe.ebyzom.lumen.data.repository.ScriptRepository repository) {
        super();
    }
    
    @org.jetbrains.annotations.NotNull
    public final kotlinx.coroutines.flow.StateFlow<java.util.List<pe.ebyzom.lumen.model.Script>> getAllScripts() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull
    public final kotlinx.coroutines.flow.StateFlow<pe.ebyzom.lumen.model.Script> getCurrentScript() {
        return null;
    }
    
    public final void loadScript(long id) {
    }
    
    public final void saveScript(@org.jetbrains.annotations.NotNull
    java.lang.String title, @org.jetbrains.annotations.NotNull
    java.lang.String content, int wpm, int fontSize) {
    }
    
    public final void deleteScript(@org.jetbrains.annotations.NotNull
    pe.ebyzom.lumen.model.Script script) {
    }
}